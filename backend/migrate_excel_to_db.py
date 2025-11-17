"""
Migrate Excel prijzenboek data to SQLite database
One-time script to import existing data
"""
from database import get_db
from excel_parser_new import parse_prijzenboek_new
from pathlib import Path


def migrate_excel_to_database(excel_path: str = None):
    """
    Migrate all items from Excel prijzenboek to SQLite database
    """
    if excel_path is None:
        excel_path = Path(__file__).parent / "Juiste opnamelijst.xlsx"

    print("=" * 80)
    print("MIGRATING EXCEL TO DATABASE")
    print("=" * 80)

    # Parse Excel
    print(f"\n1. Parsing Excel file: {excel_path}")
    items = parse_prijzenboek_new(str(excel_path))
    print(f"   Found {len(items)} items in Excel")

    # Get database
    print("\n2. Connecting to database...")
    db = get_db()
    initial_count = db.count_items()
    print(f"   Current database count: {initial_count}")

    # Import items
    print("\n3. Importing items to database...")
    result = db.bulk_upsert(items)
    print(f"   Added: {result['added']}")
    print(f"   Updated: {result['updated']}")

    # Verify
    final_count = db.count_items()
    print(f"\n4. Final database count: {final_count}")

    # Show some examples
    print("\n5. Sample items from database:")
    all_items = db.get_all_items()
    for item in all_items[:5]:
        print(f"   {item['code']}: {item['omschrijving'][:50]}")
        print(f"      Mat: €{item['materiaal']:.2f} | Uren: €{item['uren']:.2f} | Prijs: €{item['prijs_per_stuk']:.2f}")

    print("\n" + "=" * 80)
    print("MIGRATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    migrate_excel_to_database()
