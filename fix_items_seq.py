from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

tables = [
    ('bill_items', {'bill_id': 1, 'product_id': 1, 'quantity': 1, 'rate': 0, 'amount': 0}),
    ('order_items', {'order_id': 1, 'product_id': 1, 'quantity': 1, 'rate': 0, 'amount': 0}),
]

for table, dummy_data in tables:
    print(f"Fixing {table} sequence...")
    success = False
    for i in range(20):
        try:
            res = supabase.table(table).insert(dummy_data).execute()
            print(f"Success! {table} inserted with ID: {res.data[0]['id']}")
            supabase.table(table).delete().eq('id', res.data[0]['id']).execute()
            success = True
            break
        except Exception as e:
            if '23505' in str(e):
                print(f"Duplicate key error (sequence is catching up). Attempt {i+1}...")
            else:
                print(f"Other error for {table}: {e}")
                break
    if success:
        print(f"{table} sequence is fixed!\n")
