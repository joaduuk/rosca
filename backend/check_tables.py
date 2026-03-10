from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL
database_url = os.getenv('DATABASE_URL')
print(f"Connecting to: {database_url}")

# Create engine and connect
engine = create_engine(database_url)

with engine.connect() as conn:
    # Get all tables
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    tables = [row[0] for row in result]
    
    print("\n📊 Tables in database:")
    print("-" * 40)
    for table in tables:
        # Get row count for each table
        count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        print(f"  • {table}: {count} rows")
    
    print("-" * 40)
    print(f"Total tables: {len(tables)}")