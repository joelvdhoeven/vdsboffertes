"""
Document parser for Samsung Notes exports
Extracts rooms and werkzaamheden with quantities
"""
from docx import Document
import re
from typing import Dict, List, Any


def extract_quantity_and_unit(text: str) -> tuple:
    """
    Extract quantity and unit from text
    Examples:
        "10,6m2" -> (10.6, "m2", "")
        "10,6m2 behang verwijderen" -> (10.6, "m2", "behang verwijderen")
        "2x uitzetijzer vervangen" -> (2, "stu", "uitzetijzer vervangen")
        "Radiator demonteren" -> (1, "stu", "Radiator demonteren")
    """
    text = text.strip()

    # Pattern 1: "10,6m2 description" or "10.6m2 description"
    pattern1 = r'^(\d+[,.]?\d*)\s*(m2|m1|m²|m³|cm|mm|stu|st)[\s]*(.*)'
    match = re.match(pattern1, text, re.IGNORECASE)
    if match:
        qty_str = match.group(1).replace(',', '.')
        unit = match.group(2).lower()
        description = match.group(3).strip()

        # Normalize units
        if unit in ['m²', 'm2']:
            unit = 'm2'
        elif unit in ['m1']:
            unit = 'm1'
        elif unit in ['st', 'stu', 'stuks']:
            unit = 'stu'

        return (float(qty_str), unit, description if description else text)

    # Pattern 2: "2x description" (stuks)
    pattern2 = r'^(\d+)\s*x\s+(.*)'
    match = re.match(pattern2, text, re.IGNORECASE)
    if match:
        qty = int(match.group(1))
        description = match.group(2).strip()
        return (qty, 'stu', description)

    # Pattern 3: "description 10,6m2" (quantity at end)
    pattern3 = r'^(.+?)\s+(\d+[,.]?\d*)\s*(m2|m1|m²|cm|mm|stu)$'
    match = re.match(pattern3, text, re.IGNORECASE)
    if match:
        description = match.group(1).strip()
        qty_str = match.group(2).replace(',', '.')
        unit = match.group(3).lower()

        # Normalize units
        if unit in ['m²', 'm2']:
            unit = 'm2'
        elif unit in ['m1']:
            unit = 'm1'

        return (float(qty_str), unit, description)

    # Pattern 4: No quantity specified, assume 1 stuks
    return (1, 'stu', text)


def is_room_header(text: str) -> bool:
    """
    Determine if a line is a room header
    Room headers are typically:
    - Single line
    - Not containing numbers/quantities at start
    - Common room names
    """
    text = text.strip().lower()

    # Common room names
    room_keywords = [
        'slaapkamer', 'woonkamer', 'keuken', 'badkamer', 'toilet', 'wc',
        'hal', 'overloop', 'gang', 'berging', 'zolder', 'kelder',
        'trapopgang', 'entree', 'garage', 'schuur', 'tuin',
        'boven', 'beneden', 'voor', 'achter'
    ]

    # Check if it contains room keywords
    for keyword in room_keywords:
        if keyword in text:
            # Make sure it doesn't start with a number (which would be a werkzaamheid)
            if not re.match(r'^\d+', text.strip()):
                return True

    return False


def parse_docx_opname(file_path: str) -> Dict[str, Any]:
    """
    Parse a Samsung Notes DOCX export
    Returns structured data with rooms and werkzaamheden
    """
    doc = Document(file_path)

    # Extract metadata and content
    metadata = {
        "datum": None,
        "adres": None,
        "opzichter": None
    }

    ruimtes = []
    current_ruimte = None
    first_line = True

    for para in doc.paragraphs:
        text = para.text.strip()

        if not text:
            continue

        # First non-empty line is usually the address
        if first_line and not is_room_header(text):
            metadata["adres"] = text
            first_line = False
            continue

        first_line = False

        # Check if this is a room header
        if is_room_header(text):
            # Save previous room if exists
            if current_ruimte and current_ruimte["werkzaamheden"]:
                ruimtes.append(current_ruimte)

            # Start new room
            current_ruimte = {
                "naam": text,
                "werkzaamheden": []
            }
        else:
            # This is a werkzaamheid
            if current_ruimte is None:
                # Create a default room if we haven't seen a room header yet
                current_ruimte = {
                    "naam": "Algemeen",
                    "werkzaamheden": []
                }

            # Extract quantity, unit, and description
            qty, unit, description = extract_quantity_and_unit(text)

            werkzaamheid = {
                "omschrijving": description,
                "hoeveelheid": qty,
                "eenheid": unit,
                "raw_text": text
            }

            current_ruimte["werkzaamheden"].append(werkzaamheid)

    # Don't forget the last room
    if current_ruimte and current_ruimte["werkzaamheden"]:
        ruimtes.append(current_ruimte)

    return {
        "metadata": metadata,
        "ruimtes": ruimtes
    }


if __name__ == "__main__":
    # Test with example file
    result = parse_docx_opname("/home/user/vdsboffertes/Voorofscheweg_218_251107_094114.docx")

    print("=" * 80)
    print("PARSED OPNAME")
    print("=" * 80)
    print(f"\nMetadata: {result['metadata']}")
    print(f"\nTotal ruimtes: {len(result['ruimtes'])}")

    for ruimte in result['ruimtes']:
        print(f"\n\n{'='*80}")
        print(f"RUIMTE: {ruimte['naam']}")
        print(f"{'='*80}")
        print(f"Werkzaamheden: {len(ruimte['werkzaamheden'])}")

        for wz in ruimte['werkzaamheden']:
            print(f"\n  - {wz['hoeveelheid']} {wz['eenheid']} | {wz['omschrijving']}")
            print(f"    (raw: {wz['raw_text']})")
