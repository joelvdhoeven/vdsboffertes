"""
Excel prijzenboek parser voor nieuwe structuur
Met ruimte kolommen (C-O) en prijzen in kolommen R-Y
"""
import openpyxl
from typing import List, Dict, Any


def parse_prijzenboek_new(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse de nieuwe prijzenboek structuur
    Kolommen:
    A: CODERING DATABASE
    B: OMSCHRIJVING VAKMAN MUTATIE
    C-O: Ruimtes (Algemeen woning, Hal/Overloop, etc.)
    Q: TOTAAL
    R: EENHEID
    S: Materiaal per stuk EXCL BTW
    T: Uren per stuk EXCL BTW
    U: Prijs per stuk EXCL BTW
    W: TOTAAL EXCL BTW
    X: TOTAAL INCL BTW
    Y: OMSCHRIJVING OFFERTE MUTATIE
    """
    wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
    sheet = wb.active

    prijzenboek = []

    # Start from row 2 (skip header)
    for row_num in range(2, sheet.max_row + 1):
        # Get values
        code = sheet.cell(row=row_num, column=1).value  # Column A
        omschrijving = sheet.cell(row=row_num, column=2).value  # Column B
        eenheid = sheet.cell(row=row_num, column=18).value  # Column R
        materiaal = sheet.cell(row=row_num, column=19).value  # Column S
        uren = sheet.cell(row=row_num, column=20).value  # Column T

        # Skip empty rows
        if not code or not omschrijving:
            continue

        # Normalize eenheid
        if eenheid:
            eenheid = str(eenheid).strip().lower()

        item = {
            "code": str(code).strip() if code else "",
            "omschrijving": str(omschrijving).strip(),
            "eenheid": eenheid or "",
            "materiaal": float(materiaal) if materiaal else 0.0,
            "uren": float(uren) if uren else 0.0,
            "row_num": row_num
        }

        prijzenboek.append(item)

    wb.close()
    return prijzenboek


if __name__ == "__main__":
    # Test
    prijzenboek = parse_prijzenboek_new("/home/user/vdsboffertes/backend/Juiste opnamelijst.xlsx")
    print(f"Total items: {len(prijzenboek)}")
    print("\nFirst 5 items:")
    for item in prijzenboek[:5]:
        print(f"{item['code']}: {item['omschrijving']} ({item['eenheid']}) - €{item['materiaal']:.2f} + {item['uren']}u")
