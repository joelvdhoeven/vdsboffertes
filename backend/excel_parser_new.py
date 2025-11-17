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
    row_num = 1  # Will be incremented to 2 at first iteration

    # Use iter_rows for much better performance with read_only mode
    for row in sheet.iter_rows(min_row=2, max_col=25, values_only=True):
        row_num += 1  # Increment at start (2, 3, 4, ...)

        # Get values from tuple - Basis informatie
        code = row[0] if len(row) > 0 else None  # A
        omschrijving = row[1] if len(row) > 1 else None  # B

        # Skip empty rows
        if not code or not omschrijving:
            continue

        # Ruimtes (C-O) - indices 2-14
        algemeen_woning = row[2] if len(row) > 2 else None  # C
        hal_overloop = row[3] if len(row) > 3 else None  # D
        woonkamer = row[4] if len(row) > 4 else None  # E
        keuken = row[5] if len(row) > 5 else None  # F
        toilet = row[6] if len(row) > 6 else None  # G
        badkamer = row[7] if len(row) > 7 else None  # H
        slaapk_voor_kl = row[8] if len(row) > 8 else None  # I
        slaapk_voor_gr = row[9] if len(row) > 9 else None  # J
        slaapk_achter_kl = row[10] if len(row) > 10 else None  # K
        slaapk_achter_gr = row[11] if len(row) > 11 else None  # L
        zolder = row[12] if len(row) > 12 else None  # M
        berging = row[13] if len(row) > 13 else None  # N
        meerwerk = row[14] if len(row) > 14 else None  # O

        # Prijzen - indices 16-24 (skip P which is index 15, V which is index 21)
        totaal = row[16] if len(row) > 16 else None  # Q
        eenheid = row[17] if len(row) > 17 else None  # R
        materiaal = row[18] if len(row) > 18 else None  # S
        uren = row[19] if len(row) > 19 else None  # T
        prijs_per_stuk = row[20] if len(row) > 20 else None  # U
        totaal_excl = row[22] if len(row) > 22 else None  # W
        totaal_incl = row[23] if len(row) > 23 else None  # X
        omschrijving_offerte = row[24] if len(row) > 24 else None  # Y

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
