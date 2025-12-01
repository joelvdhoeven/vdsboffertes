"""
Excel generator - fills Woonforte offerte template with matched werkzaamheden
"""
import openpyxl
from openpyxl import load_workbook
from typing import List, Dict, Any
from pathlib import Path
from datetime import datetime
import shutil


def generate_filled_excel(
    template_path: str,
    matches: List[Dict[str, Any]],
    session_dir: Path
) -> str:
    """
    Generate filled Excel file using Woonforte offerte template

    Args:
        template_path: Path to template (not used, we use our own template)
        matches: List of matched werkzaamheden
        session_dir: Session directory for output

    Returns:
        Path to generated Excel file
    """
    # Use our offerte template
    template_file = Path(__file__).parent / "templates" / "offerte_template.xlsx"

    if not template_file.exists():
        raise FileNotFoundError(f"Template not found: {template_file}")

    # Load template
    wb = load_workbook(template_file)
    ws = wb.active

    # Extract metadata from first match if available
    adres = "Adres niet beschikbaar"
    if matches and matches[0].get("opname_item"):
        # Try to get address from session or metadata
        adres = "Project adres"  # TODO: Get from parsed_opname metadata

    # Fill header information
    ws['A8'] = f"Adres : {adres}"
    ws['H8'] = datetime.now()
    ws['B10'] = "Opzichter"  # TODO: Get from settings or metadata

    # Starting row for werkzaamheden (after headers at row 16)
    current_row = 17

    # Group matches by ruimte
    ruimtes_dict = {}
    for match in matches:
        ruimte = match.get("ruimte", "Algemeen")
        if ruimte not in ruimtes_dict:
            ruimtes_dict[ruimte] = []
        ruimtes_dict[ruimte].append(match)

    # Track totals
    totaal_laag_btw = 0.0  # 9% BTW items
    totaal_hoog_btw = 0.0  # 21% BTW items

    # Fill werkzaamheden per ruimte
    for ruimte, ruimte_matches in ruimtes_dict.items():
        # Write ruimte header
        ws.cell(row=current_row, column=1, value=ruimte)
        current_row += 1

        # Write werkzaamheden for this ruimte
        for match in ruimte_matches:
            code = match["prijzenboek_match"]["code"]
            omschrijving = match["prijzenboek_match"]["omschrijving"]
            hoeveelheid = float(match["opname_item"]["hoeveelheid"])
            eenheid = match["opname_item"]["eenheid"]
            prijs_per_stuk = float(match["prijzenboek_match"].get("prijs_per_stuk", 0))

            # Determine BTW rate (default to 21% unless specified)
            # TODO: Get BTW rate from prijzenboek item metadata
            btw_rate = 0.21  # 21% is hoog tarief

            # Write row data
            ws.cell(row=current_row, column=1, value=code)  # A: Code
            ws.cell(row=current_row, column=2, value=omschrijving)  # B: Omschrijving
            ws.cell(row=current_row, column=3, value=hoeveelheid)  # C: Aantal
            ws.cell(row=current_row, column=4, value=eenheid)  # D: Eenheid

            # Calculate regel totaal
            regel_totaal = hoeveelheid * prijs_per_stuk

            if btw_rate == 0.09:
                # 9% BTW (laag tarief)
                ws.cell(row=current_row, column=5, value=prijs_per_stuk)  # E: Prijs/Eenheid excl btw 9%
                ws.cell(row=current_row, column=7, value=regel_totaal)  # G: Prijs/regel excl. BTW Laag
                totaal_laag_btw += regel_totaal
            else:
                # 21% BTW (hoog tarief)
                ws.cell(row=current_row, column=6, value=prijs_per_stuk)  # F: Prijs/Eenheid excl btw 21%
                ws.cell(row=current_row, column=8, value=regel_totaal)  # H: Prijs/regel excl. BTW Hoog
                totaal_hoog_btw += regel_totaal

            # Totaal excl BTW
            ws.cell(row=current_row, column=9, value=regel_totaal)  # I: Prijs/regel excl. BTW Totaal

            current_row += 1

        # Add blank line between ruimtes
        current_row += 1

    # Calculate totals
    totaal_excl_btw = totaal_laag_btw + totaal_hoog_btw

    # Update totals section (starting at row 21)
    totals_row = current_row + 1

    # Write "Totaal" label
    ws.cell(row=totals_row, column=1, value="Totaal")
    ws.cell(row=totals_row, column=2, value=totaal_excl_btw)  # Totaal excl BTW
    ws.cell(row=totals_row, column=8, value=totaal_hoog_btw)  # Totaal hoog BTW
    ws.cell(row=totals_row, column=9, value=totaal_excl_btw)  # Grand total

    # BTW calculations
    btw_laag = totaal_laag_btw * 0.09
    btw_hoog = totaal_hoog_btw * 0.21
    totaal_incl_btw = totaal_excl_btw + btw_laag + btw_hoog

    # Write BTW totals
    totals_row += 2
    ws.cell(row=totals_row, column=7, value="Totaal incl. BTW")
    ws.cell(row=totals_row, column=9, value=totaal_incl_btw)

    # BTW verlegd section
    totals_row += 2
    ws.cell(row=totals_row, column=1, value="BTW verlegd")
    ws.cell(row=totals_row, column=3, value=0.21)
    ws.cell(row=totals_row, column=4, value=totaal_hoog_btw)
    ws.cell(row=totals_row, column=5, value=btw_hoog)

    totals_row += 1
    ws.cell(row=totals_row, column=1, value="BTW verlegd")
    ws.cell(row=totals_row, column=3, value=0.09)
    ws.cell(row=totals_row, column=4, value=totaal_laag_btw)
    ws.cell(row=totals_row, column=5, value=btw_laag)

    # Save the filled workbook
    output_filename = f"Offerte_Generated_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    output_path = session_dir / output_filename

    wb.save(str(output_path))
    wb.close()

    print(f"\nGenerated Excel offerte:")
    print(f"  File: {output_path}")
    print(f"  Items: {len(matches)}")
    print(f"  Totaal excl BTW: €{totaal_excl_btw:.2f}")
    print(f"  BTW Laag (9%): €{btw_laag:.2f}")
    print(f"  BTW Hoog (21%): €{btw_hoog:.2f}")
    print(f"  Totaal incl BTW: €{totaal_incl_btw:.2f}")

    return str(output_path)


if __name__ == "__main__":
    # Test the generator
    print("Excel generator ready")
    print(f"Template location: {Path(__file__).parent / 'templates' / 'offerte_template.xlsx'}")
