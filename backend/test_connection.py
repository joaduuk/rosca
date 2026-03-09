from sqlalchemy import create_engine, text

# Use the same URL as in alembic.ini
DATABASE_URL = "postgresql://rosca_user:rosca_pass@localhost:5432/rosca_db"

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
        
        # Check if tables exist
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result]
        print(f"Current tables: {tables}")
        
except Exception as e:
    print(f"❌ Connection failed: {e}")