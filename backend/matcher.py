"""
Fuzzy matching engine for werkzaamheden
Matches opname werkzaamheden with prijzenboek items
Supports AI-enhanced matching and learning from corrections
"""
from typing import List, Dict, Any, Optional
from Levenshtein import ratio
import uuid
import asyncio

# Import AI and corrections modules (optional dependencies)
try:
    from .config import config
    from .ai_matcher import ai_semantic_match
    from .corrections_db import get_corrections_db
    AI_MODULES_AVAILABLE = True
except ImportError:
    try:
        from config import config
        from ai_matcher import ai_semantic_match
        from corrections_db import get_corrections_db
        AI_MODULES_AVAILABLE = True
    except ImportError:
        AI_MODULES_AVAILABLE = False
        config = None
        ai_semantic_match = None
        get_corrections_db = None


def normalize_text(text: str) -> str:
    """Normalize text for better matching"""
    text = text.lower().strip()
    # Remove extra whitespace
    text = " ".join(text.split())
    return text


# Construction terminology synonyms for better matching
CONSTRUCTION_SYNONYMS = {
    # Actions
    'verwijderen': ['verwijderen', 'slopen', 'afbreken', 'demonteren', 'weghalen'],
    'vervangen': ['vervangen', 'vernieuwen', 'nieuw', 'plaatsen'],
    'schilderen': ['schilderen', 'lakken', 'verven', 'gronden', 'aflakken'],
    'aanbrengen': ['aanbrengen', 'plaatsen', 'monteren', 'bevestigen', 'installeren'],
    'herstellen': ['herstellen', 'repareren', 'fixen', 'maken'],
    'egaliseren': ['egaliseren', 'vlak maken', 'stucen'],
    'stucen': ['stucen', 'pleisteren', 'stukadoren'],
    'sausen': ['sausen', 'latex', 'witten'],

    # Materials/items
    'gipsplaten': ['gipsplaten', 'gipsplaat', 'gips', 'gipsblok'],
    'behang': ['behang', 'behangwerk', 'wandbekleding'],
    'radiator': ['radiator', 'verwarming', 'radiatoren', 'cv'],
    'kozijn': ['kozijn', 'raamkozijn', 'deurkozijn', 'buitenkozijn', 'binnenkozijn'],
    'deur': ['deur', 'opdekdeur', 'binnendeur', 'opdek'],
    'raam': ['raam', 'ramen', 'venster', 'glas'],
    'plafond': ['plafond', 'plafonds'],
    'vloer': ['vloer', 'vloeren'],
    'wand': ['wand', 'wanden', 'muur', 'muren', 'binnenwand'],
    'tegelwerk': ['tegelwerk', 'tegels', 'tegel', 'betegelen'],
    'leidingen': ['leidingen', 'leiding', 'buizen', 'pijpen'],
    'vensterbank': ['vensterbank', 'raambank'],
    'dakbeschot': ['dakbeschot', 'dakbeschotting', 'dakplaat'],
    'plinten': ['plinten', 'plint', 'vloerplint'],
}


def expand_with_synonyms(text: str) -> str:
    """Expand text with construction synonyms for better matching"""
    words = text.lower().split()
    expanded_words = set(words)

    for word in words:
        for key, synonyms in CONSTRUCTION_SYNONYMS.items():
            if word in synonyms or word == key:
                expanded_words.update(synonyms)

    return " ".join(expanded_words)


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


def calculate_keyword_score(query: str, target: str) -> float:
    """
    Calculate keyword match score between two strings
    Returns score 0.0 to 1.0 based on how many important words match
    Uses construction synonym expansion for better matching
    """
    # Expand with synonyms for construction terms
    query_expanded = expand_with_synonyms(query)
    target_expanded = expand_with_synonyms(target)

    query_words = set(query_expanded.split())
    target_words = set(target_expanded.split())

    # Remove common stop words
    stop_words = {'de', 'het', 'een', 'en', 'in', 'op', 'van', 'te', 'met', 'voor', 'inclusief', 'incl', 'per', 'stuk'}
    query_words = query_words - stop_words
    target_words = target_words - stop_words

    if not query_words or not target_words:
        return 0.0

    # Count matching words
    matching_words = query_words & target_words

    # Score based on percentage of query words found in target
    query_match_ratio = len(matching_words) / len(query_words) if query_words else 0
    # Also consider how much of target is covered
    target_match_ratio = len(matching_words) / len(target_words) if target_words else 0

    # Weighted average (favor query coverage)
    return (query_match_ratio * 0.7) + (target_match_ratio * 0.3)


def calculate_fuzzy_score(query: str, target: str) -> float:
    """
    Calculate fuzzy match score between two strings
    Uses combination of Levenshtein ratio and keyword matching
    Returns score 0.0 to 1.0
    """
    query_norm = normalize_text(query)
    target_norm = normalize_text(target)

    # Exact match
    if query_norm == target_norm:
        return 1.0

    # Calculate different scores
    levenshtein_score = ratio(query_norm, target_norm)
    keyword_score = calculate_keyword_score(query, target)

    # Substring match bonus
    substring_bonus = 0.0
    if query_norm in target_norm or target_norm in query_norm:
        substring_bonus = 0.15

    # Use the best of Levenshtein or keyword matching, plus substring bonus
    # Keyword matching is often better for construction terms
    best_score = max(levenshtein_score, keyword_score * 1.2)  # Boost keyword matching

    return min(1.0, best_score + substring_bonus)


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
            werkzaamheid.get("omschrijving", ""),
            item.get("omschrijving", "")
        )

        # Calculate unit match score
        unit_score = calculate_unit_score(
            werkzaamheid.get("eenheid", ""),
            item.get("eenheid", "")
        )

        # Combined score (weighted)
        # Text: 70%, Unit: 30%
        combined_score = (text_score * 0.7) + (unit_score * 0.3)

        matches.append((item, combined_score, text_score, unit_score))

    # Sort by combined score (descending)
    matches.sort(key=lambda x: x[1], reverse=True)

    # Return top N matches
    return matches[:top_n]


def check_learned_correction(
    werkzaamheid: Dict[str, Any],
    prijzenboek: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Check if we have a learned correction for this werkzaamheid

    Returns:
        prijzenboek item if found, None otherwise
    """
    if not AI_MODULES_AVAILABLE or not config or not config.LEARNING_ENABLED:
        return None

    corrections_db = get_corrections_db()
    learned = corrections_db.find_learned_match(
        werkzaamheid.get("omschrijving", ""),
        werkzaamheid.get("eenheid", ""),
        min_frequency=config.MIN_CORRECTION_FREQUENCY
    )

    if learned:
        # Find the corresponding prijzenboek item
        for item in prijzenboek:
            if item.get("code") == learned["code"]:
                return item

    return None


async def apply_ai_matching(
    werkzaamheid: Dict[str, Any],
    candidates: List[tuple]
) -> Optional[Dict[str, Any]]:
    """
    Apply AI semantic matching to re-rank candidates

    Args:
        werkzaamheid: The work item to match
        candidates: List of (item, score, text_score, unit_score) tuples

    Returns:
        Dict with ai_result if successful, None otherwise
    """
    if not AI_MODULES_AVAILABLE or not config or not config.is_ai_available():
        return None

    if len(candidates) < 2:
        return None

    # Prepare candidates for AI matching
    candidate_items = [item for item, _, _, _ in candidates]

    try:
        ai_result = await ai_semantic_match(werkzaamheid, candidate_items)
        return ai_result
    except Exception as e:
        print(f"AI matching failed: {e}")
        return None


async def match_werkzaamheden(
    parsed_opname: Dict[str, Any],
    prijzenboek: List[Dict[str, Any]],
    use_ai: bool = False,  # AI is now OFF by default - use on-demand instead
    use_learning: bool = True
) -> List[Dict[str, Any]]:
    """
    Match all werkzaamheden from opname with prijzenboek
    Supports AI-enhanced matching and learning from corrections

    Args:
        parsed_opname: Parsed opname document
        prijzenboek: List of prijzenboek items
        use_ai: Whether to use AI matching (if available)
        use_learning: Whether to use learned corrections

    Returns:
        List of match results
    """
    all_matches = []

    # Check if we should use AI matching
    ai_enabled = (
        use_ai and
        AI_MODULES_AVAILABLE and
        config is not None and
        config.is_ai_available()
    )

    # Check if we should use learning
    learning_enabled = (
        use_learning and
        AI_MODULES_AVAILABLE and
        config is not None and
        config.LEARNING_ENABLED
    )

    for ruimte in parsed_opname["ruimtes"]:
        for werkzaamheid in ruimte["werkzaamheden"]:
            match_type = "fuzzy"
            ai_reasoning = None

            # Step 1: Check for learned corrections first
            if learning_enabled:
                learned_item = check_learned_correction(werkzaamheid, prijzenboek)
                if learned_item:
                    # Use learned match with 100% confidence
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
                            "code": learned_item["code"],
                            "omschrijving": learned_item["omschrijving"],
                            "omschrijving_offerte": learned_item.get("omschrijving_offerte", learned_item["omschrijving"]),
                            "eenheid": learned_item["eenheid"],
                            "materiaal": learned_item.get("materiaal", 0),
                            "uren": learned_item.get("uren", 0),
                            "prijs_per_stuk": learned_item.get("prijs_per_stuk", 0),
                            "prijs_excl": learned_item.get("totaal_excl", learned_item.get("prijs_per_stuk", 0)),
                            "prijs_incl": learned_item.get("totaal_incl", 0),
                            "row_num": learned_item.get("row_num", None)
                        },
                        "confidence": 1.0,
                        "text_score": 1.0,
                        "unit_score": 1.0,
                        "match_type": "learned",
                        "ai_reasoning": "Match gebaseerd op eerdere gebruikerscorrecties",
                        "status": "auto",
                        "alternatives": []
                    }
                    all_matches.append(match_result)
                    continue

            # Step 2: Find best fuzzy matches
            best_matches = find_best_matches(
                werkzaamheid,
                prijzenboek,
                top_n=config.MAX_CANDIDATES_FOR_AI if ai_enabled and config else 10
            )

            if not best_matches:
                continue

            # Step 3: Apply AI matching if enabled and confidence is not high enough
            best_item, confidence, text_score, unit_score = best_matches[0]

            if ai_enabled and confidence < 0.95 and len(best_matches) > 1:
                # Try AI matching for better results
                try:
                    ai_result = await apply_ai_matching(werkzaamheid, best_matches)
                    if ai_result and ai_result.get("confidence", 0) >= config.AI_CONFIDENCE_THRESHOLD:
                        # Use AI's choice
                        ai_index = ai_result["best_match_index"]
                        if 0 <= ai_index < len(best_matches):
                            best_item, _, text_score, unit_score = best_matches[ai_index]
                            confidence = ai_result["confidence"]
                            match_type = "ai_semantic"
                            ai_reasoning = ai_result.get("reasoning", "")

                            # Reorder best_matches to put AI choice first
                            ai_choice = best_matches.pop(ai_index)
                            best_matches.insert(0, ai_choice)
                except Exception as e:
                    print(f"AI matching error for {werkzaamheid.get('omschrijving', '')}: {e}")

            # Get alternative matches for user review
            alternatives = [
                {
                    "code": item["code"],
                    "omschrijving": item["omschrijving"],
                    "eenheid": item["eenheid"],
                    "prijs_excl": item.get("totaal_excl", item.get("prijs_per_stuk", 0)),
                    "prijs_incl": item.get("totaal_incl", 0),
                    "score": score
                }
                for item, score, _, _ in best_matches[1:5]
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
                "match_type": match_type,
                "ai_reasoning": ai_reasoning,
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
