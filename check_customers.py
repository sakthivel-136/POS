import os
from supabase import create_client

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://jydgukmjwzmdqrmvdfgq.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZGd1a21qd3ptZHFybXZkZmdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk3Njk1MiwiZXhwIjo0ODkyNTUyOTUyfQ.5Z71FjB0hA27-aZ4sK2l-x0z-22yC1QnS7M_sCj-y_Y")
supabase = create_client(url, key)

res = supabase.table('customers').select('id, customer_name, user_id').execute()
for c in res.data:
    print(c)
