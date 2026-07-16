import os
import sqlite3
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Supabase credentials
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(url, key)

# Connect to SQLite
sqlite_db = "../sql_app.db"
if not os.path.exists(sqlite_db):
    print(f"Error: {sqlite_db} not found")
    exit(1)

conn = sqlite3.connect(sqlite_db)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def migrate_table(table_name):
    print(f"Migrating {table_name}...")
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    if not rows:
        print(f"  No data found in {table_name}.")
        return

    # Convert SQLite rows to list of dicts
    data_to_insert = []
    for row in rows:
        row_dict = dict(row)
        # Clean up nulls or specific formatting if needed
        data_to_insert.append(row_dict)
    
    # Insert in batches to avoid payload limits
    batch_size = 100
    for i in range(0, len(data_to_insert), batch_size):
        batch = data_to_insert[i:i + batch_size]
        try:
            response = supabase.table(table_name).insert(batch).execute()
            print(f"  Inserted {len(batch)} rows into {table_name}.")
        except Exception as e:
            print(f"  Error inserting into {table_name}: {e}")

# Order matters due to foreign keys!
tables_in_order = [
    "users",
    "customers",
    "products",
    "customer_prices",
    "bills",
    "bill_items",
    "stock_transactions"
]

for table in tables_in_order:
    migrate_table(table)

print("Migration completed!")
conn.close()
