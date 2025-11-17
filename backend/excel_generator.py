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
    Generate filled Excel file with matched werkzaamheden

    Creates a new Excel file with all matches, their quantities, and prices
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    # Create a new workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Offerte"

    # Define styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="FF6B35", end_color="FF6B35", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Create headers
    headers = [
        "Ruimte",
        "Opname Omschrijving",
        "Hoeveelheid",
        "Eenheid",
        "Prijzenboek Code",
        "Prijzenboek Omschrijving",
        "Prijs per stuk",
        "Totaal Excl. BTW",
        "Match Type",
        "Confidence %"
    ]

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border

    # Fill in the data
    row_num = 2
    total_excl = 0

    for match in matches:
        ruimte = match.get("ruimte", "")
        opname = match.get("opname_item", {})
        prijzenboek = match.get("prijzenboek_match", {})

        hoeveelheid = float(opname.get("hoeveelheid", 1))
        prijs_per_stuk = float(prijzenboek.get("prijs_per_stuk", prijzenboek.get("prijs_excl", 0)))
        totaal = hoeveelheid * prijs_per_stuk
        total_excl += totaal

        # Write row data
        ws.cell(row=row_num, column=1, value=ruimte).border = border
        ws.cell(row=row_num, column=2, value=opname.get("omschrijving", "")).border = border
        ws.cell(row=row_num, column=3, value=hoeveelheid).border = border
        ws.cell(row=row_num, column=4, value=opname.get("eenheid", "")).border = border
        ws.cell(row=row_num, column=5, value=prijzenboek.get("code", "")).border = border
        ws.cell(row=row_num, column=6, value=prijzenboek.get("omschrijving", "")).border = border

        prijs_cell = ws.cell(row=row_num, column=7, value=prijs_per_stuk)
        prijs_cell.number_format = '€#,##0.00'
        prijs_cell.border = border

        totaal_cell = ws.cell(row=row_num, column=8, value=totaal)
        totaal_cell.number_format = '€#,##0.00'
        totaal_cell.border = border

        match_type = match.get("match_type", "fuzzy")
        ws.cell(row=row_num, column=9, value=match_type).border = border

        confidence = match.get("confidence", 0) * 100
        conf_cell = ws.cell(row=row_num, column=10, value=confidence)
        conf_cell.number_format = '0.0"%"'
        conf_cell.border = border

        row_num += 1

    # Add totals row
    row_num += 1
    ws.cell(row=row_num, column=7, value="Totaal Excl. BTW:").font = Font(bold=True)
    total_cell = ws.cell(row=row_num, column=8, value=total_excl)
    total_cell.number_format = '€#,##0.00'
    total_cell.font = Font(bold=True)

    # BTW calculation
    btw_percentage = 0.21
    btw_amount = total_excl * btw_percentage
    row_num += 1
    ws.cell(row=row_num, column=7, value="BTW (21%):").font = Font(bold=True)
    btw_cell = ws.cell(row=row_num, column=8, value=btw_amount)
    btw_cell.number_format = '€#,##0.00'
    btw_cell.font = Font(bold=True)

    # Total incl BTW
    row_num += 1
    ws.cell(row=row_num, column=7, value="Totaal Incl. BTW:").font = Font(bold=True)
    total_incl_cell = ws.cell(row=row_num, column=8, value=total_excl + btw_amount)
    total_incl_cell.number_format = '€#,##0.00'
    total_incl_cell.font = Font(bold=True)

    # Auto-adjust column widths
    for col_num in range(1, len(headers) + 1):
        column_letter = openpyxl.utils.get_column_letter(col_num)
        max_length = len(str(headers[col_num - 1]))

        for row in range(2, ws.max_row + 1):
            cell_value = ws.cell(row=row, column=col_num).value
            if cell_value:
                max_length = max(max_length, len(str(cell_value)))

        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width

    # Save the workbook
    output_filename = "Offerte_Generated.xlsx"
    output_path = session_dir / output_filename

    wb.save(str(output_path))
    wb.close()

    print(f"Generated Excel with {len(matches)} items, total: €{total_excl:.2f}")

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
