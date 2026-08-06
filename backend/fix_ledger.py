import sys
import os

from database import get_supabase

def fix_ledger():
    supabase = get_supabase()
    
    print("Fetching all bills...")
    bills_res = supabase.table('bills').select('*').execute()
    bills = bills_res.data
    
    print(f"Found {len(bills)} bills. Fixing pending amounts...")
    
    customer_balances = {}
    
    for bill in bills:
        total = float(bill['total_amount'] or 0)
        paid = float(bill['paid_amount'] or 0)
        
        # New pending is strictly for this bill
        new_pending = max(0.0, total - paid)
        
        # Update bill if needed
        if float(bill['pending_amount'] or 0) != new_pending:
            supabase.table('bills').update({'pending_amount': new_pending}).eq('id', bill['id']).execute()
            print(f"Fixed Bill #{bill['id']}: pending amount set to {new_pending}")
            
        # Accumulate correct total pending for customer
        cid = bill['customer_id']
        if cid not in customer_balances:
            customer_balances[cid] = 0.0
        customer_balances[cid] += new_pending

    print("Fetching all customers to update credit limits...")
    customers_res = supabase.table('customers').select('*').execute()
    customers = customers_res.data
    
    for customer in customers:
        cid = customer['id']
        correct_balance = customer_balances.get(cid, 0.0)
        current_limit = float(customer.get('credit_limit') or 0.0)
        
        if correct_balance != current_limit:
            supabase.table('customers').update({'credit_limit': correct_balance}).eq('id', cid).execute()
            print(f"Fixed Customer {customer['customer_name']}: balance set to {correct_balance} (was {current_limit})")
            
    print("Ledger fully synchronized and fixed!")

if __name__ == "__main__":
    fix_ledger()
