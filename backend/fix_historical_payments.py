import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_supabase

try:
    supabase = get_supabase()
except Exception as e:
    print(f"Error getting supabase client: {e}")
    sys.exit(1)

def fix_all_customers():
    # 1. Fetch all customers
    cust_res = supabase.table('customers').select('*').execute()
    customers = cust_res.data
    
    for c in customers:
        customer_id = c['id']
        print(f"Processing Customer {customer_id} ({c.get('customer_name')})")
        
        # 2. Fetch all bills for this customer
        bills_res = supabase.table('bills').select('*').eq('customer_id', customer_id).order('bill_date', desc=False).execute()
        bills = bills_res.data
        
        # Calculate total payments ever received
        total_billed = sum(float(b['total_amount']) for b in bills)
        total_paid_distributed = sum(float(b.get('paid_amount', 0)) for b in bills)
        
        # Reset all bills to unpaid
        for b in bills:
            b['new_paid'] = 0
            b['new_pending'] = float(b['total_amount'])
            
        remaining_pool = total_paid_distributed
        
        for b in bills:
            if remaining_pool <= 0:
                break
                
            bill_total = float(b['total_amount'])
            
            if remaining_pool >= bill_total:
                b['new_paid'] = bill_total
                b['new_pending'] = 0
                remaining_pool -= bill_total
            else:
                b['new_paid'] = remaining_pool
                b['new_pending'] = bill_total - remaining_pool
                remaining_pool = 0
                
        # Now update all bills
        for b in bills:
            new_status = 'paid' if b['new_pending'] == 0 else ('partially_paid' if b['new_paid'] > 0 else 'unpaid')
            
            # Only update if changed
            if float(b.get('paid_amount', 0)) != b['new_paid'] or float(b.get('pending_amount', 0)) != b['new_pending'] or b.get('status') != new_status:
                supabase.table('bills').update({
                    'paid_amount': b['new_paid'],
                    'pending_amount': b['new_pending'],
                    'status': new_status
                }).eq('id', b['id']).execute()
                print(f"  - Updated Bill {b['id']}: Paid={b['new_paid']}, Pending={b['new_pending']}")

        # Finally, update the customer's credit limit (running balance)
        final_pending = total_billed - total_paid_distributed
        
        # Update customer
        if float(c.get('credit_limit') or 0) != final_pending:
            supabase.table('customers').update({'credit_limit': final_pending}).eq('id', customer_id).execute()
            print(f"  - Updated Customer {customer_id} balance to {final_pending}")
            
    print("All customers processed successfully!")

if __name__ == "__main__":
    fix_all_customers()
