"""
Fuzzy matching engine for werkzaamheden
Matches opname werkzaamheden with prijzenboek items
"""
from typing import List, Dict, Any
from Levenshtein import ratio
import uuid


def normalize_text(text: str) -> str:
    """Normalize text for better matching"""
    text = text.lower().strip()
    # Remove extra whitespace
    text = " ".join(text.split())
    return text


def normalize_unit(unit: str) -> str:
    """Normalize unit names"""
    unit = unit.lower().strip()

    # Normalization mapping
    unit_map = {
        'm²': 'm2',
        'm2': 'm2',
        'vierkante meter': 'm2',
        'm¹': 'm1',
        'm1': 'm1',
        'meter': 'm1',
        'strekkende meter': 'm1',
        'stu': 'stu',
        'stuks': 'stu',
        'st': 'stu',
        'stuk': 'stu',
        'pcs': 'stu',
        'cm': 'cm',
        'mm': 'mm',
        'won': 'won',
        'woning': 'won',
        'ruimte': 'ruimte',
        'm³': 'm3',
        'm3': 'm3',
        'kubieke meter': 'm3',
    }

    return unit_map.get(unit, unit)


def calculate_fuzzy_score(query: str, target: str) -> float:
    """
    Calculate fuzzy match score between two strings
    Uses Levenshtein ratio
    Returns score 0.0 to 1.0
    """
    query_norm = normalize_text(query)
    target_norm = normalize_text(target)

    # Exact match
    if query_norm == target_norm:
        return 1.0

    # Substring match bonus
    if query_norm in target_norm or target_norm in query_norm:
        base_score = ratio(query_norm, target_norm)
        return min(1.0, base_score + 0.1)  # Boost by 10% for substring match

    # Regular Levenshtein ratio
    return ratio(query_norm, target_norm)


def calculate_unit_score(opname_unit: str, prijzenboek_unit: str) -> float:
    """
    Calculate unit match score
    Returns 1.0 for exact match, 0.5 for compatible units, 0.0 for mismatch
    """
    opname_norm = normalize_unit(opname_unit)
    prijzenboek_norm = normalize_unit(prijzenboek_unit)

    # Exact match
    if opname_norm == prijzenboek_norm:
        return 1.0

    # Compatible units (e.g., both are length measurements)
    length_units = {'m1', 'm', 'cm', 'mm'}
    area_units = {'m2', 'm²'}
    count_units = {'stu', 'stuks', 'st', 'stuk', 'pcs'}
    volume_units = {'m3', 'm³'}
    woning_units = {'won', 'woning'}
    ruimte_units = {'ruimte'}

    if opname_norm in length_units and prijzenboek_norm in length_units:
        return 0.7
    if opname_norm in area_units and prijzenboek_norm in area_units:
        return 0.9
    if opname_norm in count_units and prijzenboek_norm in count_units:
        return 0.9
    if opname_norm in volume_units and prijzenboek_norm in volume_units:
        return 0.9
    if opname_norm in woning_units and prijzenboek_norm in woning_units:
        return 0.9
    if opname_norm in ruimte_units and prijzenboek_norm in ruimte_units:
        return 0.9

    # No match
    return 0.0


def find_best_matches(
    werkzaamheid: Dict[str, Any],
    prijzenboek: List[Dict[str, Any]],
    top_n: int = 5
) -> List[tuple]:
    """
    Find top N best matches for a werkzaamheid
    Returns list of (prijzenboek_item, score) tuples
    """
    matches = []

    for item in prijzenboek:
        # Calculate text similarity score
        text_score = calculate_fuzzy_score(
            werkzaamheid["omschrijving"],
            item["omschrijving"]
        )

        # Calculate unit match score
        unit_score = calculate_unit_score(
            werkzaamheid["eenheid"],
            item["eenheid"]
        )

        # Combined score (weighted)
        # Text: 70%, Unit: 30%
        combined_score = (text_score * 0.7) + (unit_score * 0.3)

        matches.append((item, combined_score, text_score, unit_score))

    # Sort by combined score (descending)
    matches.sort(key=lambda x: x[1], reverse=True)

    # Return top N matches
    return matches[:top_n]


def match_werkzaamheden(
    parsed_opname: Dict[str, Any],
    prijzenboek: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Match all werkzaamheden from opname with prijzenboek
    Returns list of match results
    """
    all_matches = []

    for ruimte in parsed_opname["ruimtes"]:
        for werkzaamheid in ruimte["werkzaamheden"]:
            # Find best matches
            best_matches = find_best_matches(werkzaamheid, prijzenboek, top_n=5)

            if not best_matches:
                continue

            # Take the best match
            best_item, confidence, text_score, unit_score = best_matches[0]

            # Get alternative matches for user review
            alternatives = [
                {
                    "code": item["code"],
                    "omschrijving": item["omschrijving"],
                    "eenheid": item["eenheid"],
                    "prijs_excl": item["totaal_excl"],
                    "prijs_incl": item["totaal_incl"],
                    "score": score
                }
                for item, score, _, _ in best_matches[1:top_n]
            ]

            match_result = {
                "id": str(uuid.uuid4()),
                "ruimte": ruimte["naam"],
                "opname_item": {
                    "omschrijving": werkzaamheid["omschrijving"],
                    "hoeveelheid": werkzaamheid["hoeveelheid"],
                    "eenheid": werkzaamheid["eenheid"],
                    "raw_text": werkzaamheid.get("raw_text", "")
                },
                "prijzenboek_match": {
                    "code": best_item["code"],
                    "omschrijving": best_item["omschrijving"],
                    "omschrijving_offerte": best_item.get("omschrijving_offerte", best_item["omschrijving"]),
                    "eenheid": best_item["eenheid"],
                    "materiaal": best_item.get("materiaal", 0),
                    "uren": best_item.get("uren", 0),
                    "prijs_per_stuk": best_item.get("prijs_per_stuk", 0),
                    "prijs_excl": best_item.get("totaal_excl", best_item.get("prijs_per_stuk", 0)),
                    "prijs_incl": best_item.get("totaal_incl", 0),
                    "row_num": best_item.get("row_num", None)
                },
                "confidence": round(confidence, 3),
                "text_score": round(text_score, 3),
                "unit_score": round(unit_score, 3),
                "match_type": "fuzzy",
                "status": "auto" if confidence >= 0.9 else "review",
                "alternatives": alternatives
            }

            all_matches.append(match_result)

    return all_matches


if __name__ == "__main__":
    # Test matching
    from document_parser import parse_docx_opname
    from excel_parser import parse_prijzenboek

    print("Loading documents...")
    opname = parse_docx_opname("/home/user/vdsboffertes/Voorofscheweg_218_251107_094114.docx")
    print(f"Parsed opname: {len(opname['ruimtes'])} ruimtes")

    print("\nLoading prijzenboek...")
    prijzenboek = parse_prijzenboek("/home/user/vdsboffertes/Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm")
    print(f"Parsed prijzenboek: {len(prijzenboek)} items")

    print("\nMatching...")
    matches = match_werkzaamheden(opname, prijzenboek)

    print(f"\n{'='*80}")
    print(f"MATCHING RESULTS")
    print(f"{'='*80}")
    print(f"\nTotal matches: {len(matches)}")

    # Statistics
    high_conf = sum(1 for m in matches if m["confidence"] >= 0.9)
    medium_conf = sum(1 for m in matches if 0.7 <= m["confidence"] < 0.9)
    low_conf = sum(1 for m in matches if m["confidence"] < 0.7)

    print(f"\nConfidence breakdown:")
    print(f"  High (>= 90%): {high_conf}")
    print(f"  Medium (70-89%): {medium_conf}")
    print(f"  Low (< 70%): {low_conf}")

    # Show first 10 matches
    print(f"\n{'='*80}")
    print("First 10 matches:")
    print(f"{'='*80}")

    for i, match in enumerate(matches[:10], 1):
        print(f"\n{i}. [{match['ruimte']}]")
        print(f"   Opname: {match['opname_item']['hoeveelheid']} {match['opname_item']['eenheid']} | {match['opname_item']['omschrijving']}")
        print(f"   Match:  {match['prijzenboek_match']['omschrijving']} ({match['prijzenboek_match']['eenheid']})")
        print(f"   Code:   {match['prijzenboek_match']['code']}")
        print(f"   Confidence: {match['confidence']*100:.1f}% (text: {match['text_score']*100:.0f}%, unit: {match['unit_score']*100:.0f}%)")
        print(f"   Price:  €{match['prijzenboek_match']['prijs_excl']:.2f} excl / €{match['prijzenboek_match']['prijs_incl']:.2f} incl")
