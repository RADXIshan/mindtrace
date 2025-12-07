"""
Migration script to remove the mood column from interactions table.
Run this script to update the database schema.
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, SessionLocal

def remove_mood_column():
    """Remove mood column from interactions table"""
    db = SessionLocal()
    try:
        print("Removing mood column from interactions table...")
        
        # Check if column exists first
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='interactions' AND column_name='mood'
        """))
        
        if result.fetchone():
            # Drop the mood column
            db.execute(text("ALTER TABLE interactions DROP COLUMN mood"))
            db.commit()
            print("✓ Successfully removed mood column from interactions table")
        else:
            print("✓ Mood column does not exist (already removed or never existed)")
            
    except Exception as e:
        print(f"✗ Error removing mood column: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Remove Mood Column")
    print("=" * 60)
    
    response = input("This will remove the 'mood' column from the interactions table. Continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        remove_mood_column()
        print("\n✓ Migration completed successfully!")
    else:
        print("\n✗ Migration cancelled")
