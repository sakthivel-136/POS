from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

print("Clearing data...")

try:
    print("Deleting payments...")
    supabase.table("payments").delete().neq("id", 0).execute()
except Exception as e: print(e)

try:
    print("Deleting bill_items...")
    supabase.table("bill_items").delete().neq("id", 0).execute()
except Exception as e: print(e)

try:
    print("Deleting bills...")
    supabase.table("bills").delete().neq("id", 0).execute()
except Exception as e: print(e)

try:
    print("Deleting order_items...")
    supabase.table("order_items").delete().neq("id", 0).execute()
except Exception as e: print(e)

try:
    print("Deleting orders...")
    supabase.table("orders").delete().neq("id", 0).execute()
except Exception as e: print(e)

try:
    print("Deleting stock_transactions...")
    supabase.table("stock_transactions").delete().neq("id", 0).execute()
except Exception as e: print(e)

print("Data cleared successfully!")
