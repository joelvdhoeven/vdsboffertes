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
        # Get values - Basis informatie
        code = sheet.cell(row=row_num, column=1).value  # A
        omschrijving = sheet.cell(row=row_num, column=2).value  # B

        # Skip empty rows
        if not code or not omschrijving:
            continue

        # Ruimtes (C-O)
        algemeen_woning = sheet.cell(row=row_num, column=3).value  # C
        hal_overloop = sheet.cell(row=row_num, column=4).value  # D
        woonkamer = sheet.cell(row=row_num, column=5).value  # E
        keuken = sheet.cell(row=row_num, column=6).value  # F
        toilet = sheet.cell(row=row_num, column=7).value  # G
        badkamer = sheet.cell(row=row_num, column=8).value  # H
        slaapk_voor_kl = sheet.cell(row=row_num, column=9).value  # I
        slaapk_voor_gr = sheet.cell(row=row_num, column=10).value  # J
        slaapk_achter_kl = sheet.cell(row=row_num, column=11).value  # K
        slaapk_achter_gr = sheet.cell(row=row_num, column=12).value  # L
        zolder = sheet.cell(row=row_num, column=13).value  # M
        berging = sheet.cell(row=row_num, column=14).value  # N
        meerwerk = sheet.cell(row=row_num, column=15).value  # O

        # Prijzen
        totaal = sheet.cell(row=row_num, column=17).value  # Q
        eenheid = sheet.cell(row=row_num, column=18).value  # R
        materiaal = sheet.cell(row=row_num, column=19).value  # S
        uren = sheet.cell(row=row_num, column=20).value  # T
        prijs_per_stuk = sheet.cell(row=row_num, column=21).value  # U
        totaal_excl = sheet.cell(row=row_num, column=23).value  # W
        totaal_incl = sheet.cell(row=row_num, column=24).value  # X
        omschrijving_offerte = sheet.cell(row=row_num, column=25).value  # Y

        # Normalize eenheid
        if eenheid:
            eenheid = str(eenheid).strip().lower()

        item = {
            "code": str(code).strip() if code else "",
            "omschrijving": str(omschrijving).strip(),
            "omschrijving_offerte": str(omschrijving_offerte).strip() if omschrijving_offerte else str(omschrijving).strip(),

            # Ruimtes
            "algemeen_woning": float(algemeen_woning) if algemeen_woning else 0.0,
            "hal_overloop": float(hal_overloop) if hal_overloop else 0.0,
            "woonkamer": float(woonkamer) if woonkamer else 0.0,
            "keuken": float(keuken) if keuken else 0.0,
            "toilet": float(toilet) if toilet else 0.0,
            "badkamer": float(badkamer) if badkamer else 0.0,
            "slaapk_voor_kl": float(slaapk_voor_kl) if slaapk_voor_kl else 0.0,
            "slaapk_voor_gr": float(slaapk_voor_gr) if slaapk_voor_gr else 0.0,
            "slaapk_achter_kl": float(slaapk_achter_kl) if slaapk_achter_kl else 0.0,
            "slaapk_achter_gr": float(slaapk_achter_gr) if slaapk_achter_gr else 0.0,
            "zolder": float(zolder) if zolder else 0.0,
            "berging": float(berging) if berging else 0.0,
            "meerwerk": float(meerwerk) if meerwerk else 0.0,

            # Prijzen
            "totaal": float(totaal) if totaal else 0.0,
            "eenheid": eenheid or "",
            "materiaal": float(materiaal) if materiaal else 0.0,
            "uren": float(uren) if uren else 0.0,
            "prijs_per_stuk": float(prijs_per_stuk) if prijs_per_stuk else 0.0,
            "totaal_excl": float(totaal_excl) if totaal_excl else 0.0,
            "totaal_incl": float(totaal_incl) if totaal_incl else 0.0,

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
