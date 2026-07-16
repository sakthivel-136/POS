from supabase import create_client
import os
from dotenv import load_dotenv
import time

load_dotenv('backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

print("Fixing customers sequence...")
success = False
for i in range(20):
    try:
        res = supabase.table('customers').insert({
            'customer_name': 'Sequence Fixer'
        }).execute()
        print(f"Success! Inserted with ID: {res.data[0]['id']}")
        # Clean up the dummy row
        supabase.table('customers').delete().eq('id', res.data[0]['id']).execute()
        success = True
        break
    except Exception as e:
        if '23505' in str(e):
            print(f"Duplicate key error (sequence is catching up). Attempt {i+1}...")
        else:
            print(f"Other error: {e}")
            break

if success:
    print("Customer sequence is fixed!")
else:
    print("Could not fix customer sequence.")
