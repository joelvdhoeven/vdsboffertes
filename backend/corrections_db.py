"""
Database manager for match corrections - Learning from user corrections
"""
import sqlite3
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime


class CorrectionsDB:
    """Manages storage and retrieval of user corrections for learning"""

    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = Path(__file__).parent / "corrections.db"
        self.db_path = str(db_path)
        self.init_db()

    def get_connection(self):
        """Get database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database schema for corrections"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Create corrections table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS match_corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                opname_text TEXT NOT NULL,
                opname_eenheid TEXT NOT NULL,
                chosen_code TEXT NOT NULL,
                chosen_omschrijving TEXT,
                original_code TEXT,
                original_omschrijving TEXT,
                frequency INTEGER DEFAULT 1,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(opname_text, opname_eenheid, chosen_code)
            )
        ''')

        # Create index for fast lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_opname_lookup
            ON match_corrections(opname_text, opname_eenheid)
        ''')

        # Create AI feedback table for future model improvements
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                werkzaamheid_text TEXT NOT NULL,
                ai_suggestion_code TEXT,
                ai_confidence REAL,
                ai_reasoning TEXT,
                user_accepted INTEGER DEFAULT 0,
                user_chosen_code TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()
        conn.close()

    def add_correction(
        self,
        opname_text: str,
        opname_eenheid: str,
        chosen_code: str,
        chosen_omschrijving: str = "",
        original_code: str = "",
        original_omschrijving: str = ""
    ) -> str:
        """
        Add or update a correction

        Returns:
            'added' if new correction, 'updated' if frequency incremented
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # Normalize text for consistent matching
        opname_text_norm = opname_text.lower().strip()

        # Check if correction already exists
        cursor.execute('''
            SELECT id, frequency FROM match_corrections
            WHERE opname_text = ? AND opname_eenheid = ? AND chosen_code = ?
        ''', (opname_text_norm, opname_eenheid, chosen_code))

        row = cursor.fetchone()

        if row:
            # Update frequency and last_used
            cursor.execute('''
                UPDATE match_corrections
                SET frequency = frequency + 1,
                    last_used = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (row['id'],))
            result = 'updated'
        else:
            # Insert new correction
            cursor.execute('''
                INSERT INTO match_corrections (
                    opname_text, opname_eenheid, chosen_code, chosen_omschrijving,
                    original_code, original_omschrijving
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                opname_text_norm, opname_eenheid, chosen_code, chosen_omschrijving,
                original_code, original_omschrijving
            ))
            result = 'added'

        conn.commit()
        conn.close()
        return result

    def find_learned_match(
        self,
        opname_text: str,
        opname_eenheid: str,
        min_frequency: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Find a learned match for the given opname text and unit

        Returns:
            Dict with chosen_code, chosen_omschrijving, frequency if found
            None if no learned match exists
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        opname_text_norm = opname_text.lower().strip()

        # Find the most frequently chosen code for this text/unit combination
        cursor.execute('''
            SELECT chosen_code, chosen_omschrijving, frequency, last_used
            FROM match_corrections
            WHERE opname_text = ? AND opname_eenheid = ?
                AND frequency >= ?
            ORDER BY frequency DESC, last_used DESC
            LIMIT 1
        ''', (opname_text_norm, opname_eenheid, min_frequency))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                'code': row['chosen_code'],
                'omschrijving': row['chosen_omschrijving'],
                'frequency': row['frequency'],
                'last_used': row['last_used']
            }

        return None

    def find_similar_corrections(
        self,
        opname_text: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find corrections with similar opname text (for suggestions)
        Uses simple LIKE matching
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # Extract keywords from opname text
        words = opname_text.lower().strip().split()
        if not words:
            return []

        # Search for corrections containing any of the keywords
        results = []
        seen_codes = set()

        for word in words:
            if len(word) < 3:  # Skip short words
                continue

            cursor.execute('''
                SELECT opname_text, chosen_code, chosen_omschrijving, frequency
                FROM match_corrections
                WHERE opname_text LIKE ?
                ORDER BY frequency DESC
                LIMIT ?
            ''', (f'%{word}%', limit))

            for row in cursor.fetchall():
                if row['chosen_code'] not in seen_codes:
                    results.append({
                        'opname_text': row['opname_text'],
                        'code': row['chosen_code'],
                        'omschrijving': row['chosen_omschrijving'],
                        'frequency': row['frequency']
                    })
                    seen_codes.add(row['chosen_code'])

        conn.close()
        return results[:limit]

    def add_ai_feedback(
        self,
        werkzaamheid_text: str,
        ai_suggestion_code: str,
        ai_confidence: float,
        ai_reasoning: str,
        user_accepted: bool,
        user_chosen_code: str = ""
    ):
        """Record AI suggestion and user response for future improvements"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO ai_feedback (
                werkzaamheid_text, ai_suggestion_code, ai_confidence,
                ai_reasoning, user_accepted, user_chosen_code
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            werkzaamheid_text, ai_suggestion_code, ai_confidence,
            ai_reasoning, int(user_accepted), user_chosen_code
        ))

        conn.commit()
        conn.close()

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about corrections"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Total corrections
        cursor.execute('SELECT COUNT(*) as count FROM match_corrections')
        total_corrections = cursor.fetchone()['count']

        # Total uses (sum of frequencies)
        cursor.execute('SELECT SUM(frequency) as total FROM match_corrections')
        total_uses = cursor.fetchone()['total'] or 0

        # Most used corrections
        cursor.execute('''
            SELECT opname_text, chosen_code, chosen_omschrijving, frequency
            FROM match_corrections
            ORDER BY frequency DESC
            LIMIT 10
        ''')
        top_corrections = [dict(row) for row in cursor.fetchall()]

        # AI feedback stats
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(user_accepted) as accepted,
                AVG(ai_confidence) as avg_confidence
            FROM ai_feedback
        ''')
        ai_stats = dict(cursor.fetchone())

        conn.close()

        return {
            'total_corrections': total_corrections,
            'total_uses': total_uses,
            'top_corrections': top_corrections,
            'ai_feedback': {
                'total_suggestions': ai_stats['total'],
                'accepted': ai_stats['accepted'] or 0,
                'acceptance_rate': (ai_stats['accepted'] / ai_stats['total'] * 100) if ai_stats['total'] else 0,
                'avg_confidence': ai_stats['avg_confidence'] or 0
            }
        }

    def clear_all(self):
        """Clear all corrections (use with caution)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM match_corrections')
        cursor.execute('DELETE FROM ai_feedback')
        conn.commit()
        conn.close()

    def export_corrections(self) -> List[Dict[str, Any]]:
        """Export all corrections for backup or analysis"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT opname_text, opname_eenheid, chosen_code, chosen_omschrijving,
                   original_code, original_omschrijving, frequency, last_used, created_at
            FROM match_corrections
            ORDER BY frequency DESC
        ''')

        corrections = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return corrections


# Singleton instance
_corrections_db_instance = None


def get_corrections_db() -> CorrectionsDB:
    """Get singleton corrections database instance"""
    global _corrections_db_instance
    if _corrections_db_instance is None:
        _corrections_db_instance = CorrectionsDB()
    return _corrections_db_instance


# Singleton instance for direct import
corrections_db = get_corrections_db()


if __name__ == "__main__":
    # Test the corrections database
    db = CorrectionsDB()

    print("Corrections Database initialized")
    print(f"Statistics: {db.get_statistics()}")

    # Test adding a correction
    result = db.add_correction(
        opname_text="behang verwijderen",
        opname_eenheid="m2",
        chosen_code="0000011234",
        chosen_omschrijving="Behang verwijderen incl. lijmresten",
        original_code="0000011235",
        original_omschrijving="Behang plakken"
    )
    print(f"\nAdded correction: {result}")

    # Test finding a learned match
    match = db.find_learned_match("behang verwijderen", "m2")
    print(f"Found learned match: {match}")

    # Add same correction again (should increment frequency)
    result = db.add_correction(
        opname_text="behang verwijderen",
        opname_eenheid="m2",
        chosen_code="0000011234",
        chosen_omschrijving="Behang verwijderen incl. lijmresten"
    )
    print(f"\nAdded again: {result}")

    # Check frequency increased
    match = db.find_learned_match("behang verwijderen", "m2")
    print(f"Match frequency now: {match['frequency']}")

    # Statistics
    print(f"\nFinal statistics: {db.get_statistics()}")
