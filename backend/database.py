"""
Database manager voor prijzenboek data
Gebruikt SQLite voor persistente opslag
"""
import sqlite3
from typing import List, Dict, Any, Optional
from pathlib import Path
import json


class PrijzenboekDB:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = Path(__file__).parent / "prijzenboek.db"
        self.db_path = str(db_path)
        self.init_db()

    def get_connection(self):
        """Get database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database schema"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Create prijzenboek table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prijzenboek (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                omschrijving TEXT NOT NULL,
                omschrijving_offerte TEXT,
                eenheid TEXT NOT NULL,
                materiaal REAL DEFAULT 0,
                uren REAL DEFAULT 0,
                prijs_per_stuk REAL DEFAULT 0,
                algemeen_woning REAL DEFAULT 0,
                hal_overloop REAL DEFAULT 0,
                woonkamer REAL DEFAULT 0,
                keuken REAL DEFAULT 0,
                toilet REAL DEFAULT 0,
                badkamer REAL DEFAULT 0,
                slaapk_voor_kl REAL DEFAULT 0,
                slaapk_voor_gr REAL DEFAULT 0,
                slaapk_achter_kl REAL DEFAULT 0,
                slaapk_achter_gr REAL DEFAULT 0,
                zolder REAL DEFAULT 0,
                berging REAL DEFAULT 0,
                meerwerk REAL DEFAULT 0,
                totaal REAL DEFAULT 0,
                totaal_excl REAL DEFAULT 0,
                totaal_incl REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create index on code for fast lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_code ON prijzenboek(code)
        ''')

        conn.commit()
        conn.close()

    def get_all_items(self) -> List[Dict[str, Any]]:
        """Get all prijzenboek items"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM prijzenboek ORDER BY code
        ''')

        items = []
        for row in cursor.fetchall():
            item = dict(row)
            # Remove internal fields
            del item['id']
            del item['created_at']
            del item['updated_at']
            items.append(item)

        conn.close()
        return items

    def get_item_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Get single item by code"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM prijzenboek WHERE code = ?
        ''', (code,))

        row = cursor.fetchone()
        conn.close()

        if row:
            item = dict(row)
            del item['id']
            del item['created_at']
            del item['updated_at']
            return item
        return None

    def add_item(self, item: Dict[str, Any]) -> bool:
        """Add new item to database"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO prijzenboek (
                    code, omschrijving, omschrijving_offerte, eenheid,
                    materiaal, uren, prijs_per_stuk,
                    algemeen_woning, hal_overloop, woonkamer, keuken, toilet, badkamer,
                    slaapk_voor_kl, slaapk_voor_gr, slaapk_achter_kl, slaapk_achter_gr,
                    zolder, berging, meerwerk, totaal, totaal_excl, totaal_incl
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item.get('code', ''),
                item.get('omschrijving', ''),
                item.get('omschrijving_offerte', item.get('omschrijving', '')),
                item.get('eenheid', 'stu'),
                item.get('materiaal', 0),
                item.get('uren', 0),
                item.get('prijs_per_stuk', 0),
                item.get('algemeen_woning', 0),
                item.get('hal_overloop', 0),
                item.get('woonkamer', 0),
                item.get('keuken', 0),
                item.get('toilet', 0),
                item.get('badkamer', 0),
                item.get('slaapk_voor_kl', 0),
                item.get('slaapk_voor_gr', 0),
                item.get('slaapk_achter_kl', 0),
                item.get('slaapk_achter_gr', 0),
                item.get('zolder', 0),
                item.get('berging', 0),
                item.get('meerwerk', 0),
                item.get('totaal', 0),
                item.get('totaal_excl', 0),
                item.get('totaal_incl', 0)
            ))
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            conn.close()
            return False

    def update_item(self, code: str, item: Dict[str, Any]) -> bool:
        """Update existing item"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE prijzenboek SET
                omschrijving = ?,
                omschrijving_offerte = ?,
                eenheid = ?,
                materiaal = ?,
                uren = ?,
                prijs_per_stuk = ?,
                algemeen_woning = ?,
                hal_overloop = ?,
                woonkamer = ?,
                keuken = ?,
                toilet = ?,
                badkamer = ?,
                slaapk_voor_kl = ?,
                slaapk_voor_gr = ?,
                slaapk_achter_kl = ?,
                slaapk_achter_gr = ?,
                zolder = ?,
                berging = ?,
                meerwerk = ?,
                totaal = ?,
                totaal_excl = ?,
                totaal_incl = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE code = ?
        ''', (
            item.get('omschrijving', ''),
            item.get('omschrijving_offerte', item.get('omschrijving', '')),
            item.get('eenheid', 'stu'),
            item.get('materiaal', 0),
            item.get('uren', 0),
            item.get('prijs_per_stuk', 0),
            item.get('algemeen_woning', 0),
            item.get('hal_overloop', 0),
            item.get('woonkamer', 0),
            item.get('keuken', 0),
            item.get('toilet', 0),
            item.get('badkamer', 0),
            item.get('slaapk_voor_kl', 0),
            item.get('slaapk_voor_gr', 0),
            item.get('slaapk_achter_kl', 0),
            item.get('slaapk_achter_gr', 0),
            item.get('zolder', 0),
            item.get('berging', 0),
            item.get('meerwerk', 0),
            item.get('totaal', 0),
            item.get('totaal_excl', 0),
            item.get('totaal_incl', 0),
            code
        ))

        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return success

    def upsert_item(self, item: Dict[str, Any]) -> str:
        """Insert or update item based on code"""
        code = item.get('code', '')
        if self.get_item_by_code(code):
            self.update_item(code, item)
            return 'updated'
        else:
            self.add_item(item)
            return 'added'

    def delete_item(self, code: str) -> bool:
        """Delete item by code"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            DELETE FROM prijzenboek WHERE code = ?
        ''', (code,))

        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return success

    def bulk_upsert(self, items: List[Dict[str, Any]]) -> Dict[str, int]:
        """Bulk insert or update items"""
        added = 0
        updated = 0

        for item in items:
            result = self.upsert_item(item)
            if result == 'added':
                added += 1
            else:
                updated += 1

        return {'added': added, 'updated': updated}

    def clear_all(self):
        """Clear all items from database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM prijzenboek')
        conn.commit()
        conn.close()

    def count_items(self) -> int:
        """Get total number of items"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM prijzenboek')
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def search_items(self, query: str) -> List[Dict[str, Any]]:
        """Search items by code or omschrijving"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM prijzenboek
            WHERE code LIKE ? OR omschrijving LIKE ? OR omschrijving_offerte LIKE ?
            ORDER BY code
        ''', (f'%{query}%', f'%{query}%', f'%{query}%'))

        items = []
        for row in cursor.fetchall():
            item = dict(row)
            del item['id']
            del item['created_at']
            del item['updated_at']
            items.append(item)

        conn.close()
        return items


# Singleton instance
_db_instance = None


def get_db() -> PrijzenboekDB:
    """Get singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = PrijzenboekDB()
    return _db_instance


if __name__ == "__main__":
    # Test database
    db = PrijzenboekDB()

    print("Database initialized")
    print(f"Total items: {db.count_items()}")

    # Test add
    test_item = {
        'code': 'TEST001',
        'omschrijving': 'Test werkzaamheid',
        'omschrijving_offerte': 'Test werkzaamheid voor offerte',
        'eenheid': 'stu',
        'materiaal': 100.50,
        'uren': 25.00,
        'prijs_per_stuk': 125.50
    }

    print(f"\nAdding test item: {test_item['code']}")
    db.add_item(test_item)
    print(f"Total items after add: {db.count_items()}")

    # Test get
    retrieved = db.get_item_by_code('TEST001')
    if retrieved:
        print(f"Retrieved: {retrieved['code']} - {retrieved['omschrijving']}")
        print(f"  Materiaal: €{retrieved['materiaal']:.2f}")
        print(f"  Uren: €{retrieved['uren']:.2f}")
        print(f"  Prijs/stuk: €{retrieved['prijs_per_stuk']:.2f}")

    # Test update
    test_item['materiaal'] = 150.00
    test_item['prijs_per_stuk'] = 175.00
    db.update_item('TEST001', test_item)
    retrieved = db.get_item_by_code('TEST001')
    if retrieved:
        print(f"\nAfter update:")
        print(f"  Materiaal: €{retrieved['materiaal']:.2f}")
        print(f"  Prijs/stuk: €{retrieved['prijs_per_stuk']:.2f}")

    # Test delete
    db.delete_item('TEST001')
    print(f"\nTotal items after delete: {db.count_items()}")
