"""
Excel generator - fills template Excel with matched werkzaamheden
"""
import openpyxl
from openpyxl import load_workbook
from typing import List, Dict, Any
from pathlib import Path
import shutil


def find_row_by_code(sheet, code: str, search_column: str = "AI") -> int:
    """
    Find row number in onderhoudsprijzen sheet by prijzenboek code
    Searches in column AI which contains references to Product filter codes
    """
    # Convert column letter to number
    col_num = openpyxl.utils.column_index_from_string(search_column)

    # Search from row 13 onwards (data starts at row 13)
    for row_num in range(13, sheet.max_row + 1):
        cell_value = sheet.cell(row=row_num, column=col_num).value

        # The cell might contain a formula like ='Product filter'!A2
        # We need to check the actual computed value
        # But since we're loading with data_only=False, we won't get the computed value
        # So we'll need to match against the prijzenboek code differently

        # For now, let's just search by description in column F (AJ)
        continue

    return None


def generate_filled_excel(
    template_path: str,
    matches: List[Dict[str, Any]],
    session_dir: Path
) -> str:
    """
    Generate filled Excel file from template
    Fills in quantities in the onderhoudsprijzen sheet

    Strategy:
    - Load the template Excel
    - For each match, find the corresponding row in onderhoudsprijzen sheet
    - Fill in the quantity in column W (TOTAAL) or column H (Algemeen woning)
    - Save as new file
    """
    # Load workbook (data_only=False to preserve formulas)
    wb = load_workbook(template_path, data_only=False)

    if "onderhoudsprijzen" not in wb.sheetnames:
        raise ValueError("onderhoudsprijzen sheet not found")

    if "Prijzenboek" not in wb.sheetnames:
        raise ValueError("Prijzenboek sheet not found")

    sheet_onderhoud = wb["onderhoudsprijzen"]
    sheet_prijzenboek = wb["Prijzenboek"]

    # First, create a mapping of prijzenboek code to row number in Prijzenboek sheet
    prijzenboek_code_to_row = {}
    for row_num in range(2, sheet_prijzenboek.max_row + 1):
        code = sheet_prijzenboek.cell(row=row_num, column=1).value  # Column A
        if code:
            prijzenboek_code_to_row[str(code)] = row_num

    print(f"Built prijzenboek code mapping: {len(prijzenboek_code_to_row)} items")

    # Now, create a mapping of prijzenboek row to onderhoudsprijzen row
    # The onderhoudsprijzen sheet has formulas in columns AI-AO that reference 'Product filter'
    # which in turn references Prijzenboek
    # So we'll search by omschrijving (column F / column 36)

    # Simple approach for MVP: Search by description text
    onderhoud_rows_by_description = {}
    for row_num in range(13, min(3100, sheet_onderhoud.max_row + 1)):
        # Column F (6) has omschrijving
        omschrijving_cell = sheet_onderhoud.cell(row=row_num, column=6)
        omschrijving = omschrijving_cell.value

        if omschrijving and isinstance(omschrijving, str):
            # It might be a formula, try to get the string value
            if omschrijving.startswith('='):
                # Skip formulas for now in this simple approach
                continue

            omschrijving_clean = omschrijving.strip().lower()
            if omschrijving_clean:
                onderhoud_rows_by_description[omschrijving_clean] = row_num

    print(f"Built onderhoudsprijzen description mapping: {len(onderhoud_rows_by_description)} items")

    # Alternative approach: Since we know the row_num from prijzenboek parsing,
    # and onderhoudsprijzen formulas reference Product filter which references Prijzenboek,
    # we can use a simple offset calculation
    #
    # Product filter row N references Prijzenboek row N
    # onderhoudsprijzen row M references Product filter row (M - 11)
    # So onderhoudsprijzen row M corresponds to Prijzenboek row (M - 11)
    #
    # Therefore: onderhoudsprijzen_row = prijzenboek_row + 11

    filled_count = 0
    not_found_count = 0

    for match in matches:
        prijzenboek_code = match["prijzenboek_match"]["code"]
        prijzenboek_omschrijving = match["prijzenboek_match"]["omschrijving"]
        hoeveelheid = match["opname_item"]["hoeveelheid"]
        prijzenboek_row_num = match["prijzenboek_match"].get("row_num")

        print(f"\nProcessing match: {prijzenboek_omschrijving[:50]}")
        print(f"  Code: {prijzenboek_code}, Hoeveelheid: {hoeveelheid}")

        # Try to find the corresponding row in onderhoudsprijzen
        onderhoud_row = None

        # Method 1: Use row offset calculation
        if prijzenboek_row_num:
            onderhoud_row = prijzenboek_row_num + 11
            print(f"  Using offset calculation: onderhoud row {onderhoud_row}")

            # Validate this row exists and seems correct
            if onderhoud_row > sheet_onderhoud.max_row:
                print(f"  Row {onderhoud_row} exceeds sheet max row, skipping")
                onderhoud_row = None

        if onderhoud_row:
            # Fill in the quantity
            # Column W (23) is TOTAAL
            # Column H (8) is "Algemeen woning" (first room column)
            # For MVP, we'll fill column W (total)

            # Get current value
            current_value = sheet_onderhoud.cell(row=onderhoud_row, column=23).value

            # If current value is a formula (=SUM(...)), keep it
            # Otherwise, set the quantity
            # For MVP, let's fill column H instead (Algemeen woning)
            # This way the SUM formula in W will calculate automatically

            target_column = 8  # Column H (Algemeen woning)

            sheet_onderhoud.cell(row=onderhoud_row, column=target_column).value = hoeveelheid

            print(f"  Filled row {onderhoud_row}, column H with {hoeveelheid}")
            filled_count += 1
        else:
            print(f"  Could not find matching row in onderhoudsprijzen")
            not_found_count += 1

    print(f"\n{'='*80}")
    print(f"Filling complete:")
    print(f"  Filled: {filled_count}")
    print(f"  Not found: {not_found_count}")
    print(f"{'='*80}")

    # Save the modified workbook
    output_filename = "Offerte_Generated.xlsx"
    output_path = session_dir / output_filename

    # Save as .xlsx (not .xlsm to avoid macro issues)
    wb.save(str(output_path))

    wb.close()

    print(f"\nSaved to: {output_path}")

    return str(output_path)


if __name__ == "__main__":
    # Test the generator
    from document_parser import parse_docx_opname
    from excel_parser import parse_prijzenboek
    from matcher import match_werkzaamheden
    from pathlib import Path

    print("Loading documents...")
    opname = parse_docx_opname("/home/user/vdsboffertes/Voorofscheweg_218_251107_094114.docx")
    print(f"Parsed opname: {len(opname['ruimtes'])} ruimtes")

    print("\nLoading prijzenboek...")
    prijzenboek = parse_prijzenboek("/home/user/vdsboffertes/Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm")
    print(f"Parsed prijzenboek: {len(prijzenboek)} items")

    print("\nMatching...")
    matches = match_werkzaamheden(opname, prijzenboek)
    print(f"Total matches: {len(matches)}")

    print("\nGenerating Excel...")
    test_dir = Path("/home/user/vdsboffertes/uploads/test")
    test_dir.mkdir(parents=True, exist_ok=True)

    output_path = generate_filled_excel(
        template_path="/home/user/vdsboffertes/Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm",
        matches=matches,
        session_dir=test_dir
    )

    print(f"\n{'='*80}")
    print(f"SUCCESS! Generated Excel at:")
    print(f"{output_path}")
    print(f"{'='*80}")
