import os
from supabase import create_client

url = "https://jydgukmjwzmdqrmvdfgq.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZGd1a21qd3ptZHFybXZkZmdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk3Njk1MiwiZXhwIjo0ODkyNTUyOTUyfQ.5Z71FjB0hA27-aZ4sK2l-x0z-22yC1QnS7M_sCj-y_Y"
supabase = create_client(url, key)

def delete_data_for_gnanalakshmi():
    # Find gnanalakshmi
    res = supabase.table('customers').select('id, customer_name').ilike('customer_name', '%GNANALAKSHMI%').execute()
    if not res.data:
        print("GNANALAKSHMI not found!")
        return
    
    for customer in res.data:
        customer_id = customer['id']
        print(f"Deleting data for {customer['customer_name']} (ID: {customer_id})")
        
        # 1. Get all bills for this customer
        bills = supabase.table('bills').select('id').eq('customer_id', customer_id).execute()
        bill_ids = [b['id'] for b in bills.data]
        
        # Delete bill_items
        if bill_ids:
            supabase.table('bill_items').delete().in_('bill_id', bill_ids).execute()
            supabase.table('bills').delete().in_('id', bill_ids).execute()
            print(f"Deleted {len(bill_ids)} bills and their items.")
            
        # 2. Get all orders for this customer
        orders = supabase.table('orders').select('id').eq('customer_id', customer_id).execute()
        order_ids = [o['id'] for o in orders.data]
        
        # Delete order_items
        if order_ids:
            supabase.table('order_items').delete().in_('order_id', order_ids).execute()
            supabase.table('orders').delete().in_('id', order_ids).execute()
            print(f"Deleted {len(order_ids)} orders and their items.")
            
        # 3. Reset credit_limit
        supabase.table('customers').update({'credit_limit': 0.0}).eq('id', customer_id).execute()
        print("Reset credit limit to 0.")

if __name__ == "__main__":
    delete_data_for_gnanalakshmi()
