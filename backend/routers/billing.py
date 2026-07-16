from fastapi import APIRouter, Depends, HTTPException
from typing import List
from decimal import Decimal
from supabase import Client

import schemas, auth
from database import get_supabase

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.post("/", response_model=schemas.BillResponse)
def create_bill(bill: schemas.BillCreate, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    # Note: Supabase REST API does not support multi-statement transactions natively. 
    # For production, this should be moved to a Supabase RPC (Postgres Function).
    
    # 1. Create the bill header
    bill_data = bill.model_dump(exclude={'items'})
    bill_data['created_by'] = current_user.id
    
    bill_res = supabase.table('bills').insert(bill_data).execute()
    db_bill = bill_res.data[0]
    
    # 2. Add bill items and deduct stock
    for item in bill.items:
        # Create bill item
        item_data = item.model_dump()
        item_data['bill_id'] = db_bill['id']
        supabase.table('bill_items').insert(item_data).execute()

        # Deduct stock
        product_res = supabase.table('products').select('current_stock').eq('id', item.product_id).execute()
        if not product_res.data:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
            
        current_stock = float(product_res.data[0]['current_stock'])
        new_stock = current_stock - float(item.quantity)
        supabase.table('products').update({'current_stock': new_stock}).eq('id', item.product_id).execute()

        # Record stock transaction for sale
        stock_txn = {
            "product_id": item.product_id,
            "transaction_type": "sale",
            "quantity": float(item.quantity),
            "reason": f"Sold in Bill #{db_bill['id']}",
            "user_id": current_user.id
        }
        supabase.table('stock_transactions').insert(stock_txn).execute()

    # 3. Update customer's pending balance
    if float(bill.pending_amount) > 0:
        customer_res = supabase.table('customers').select('credit_limit').eq('id', bill.customer_id).execute()
        if customer_res.data:
            current_limit = float(customer_res.data[0].get('credit_limit') or 0)
            new_limit = current_limit + float(bill.pending_amount)
            supabase.table('customers').update({'credit_limit': new_limit}).eq('id', bill.customer_id).execute()

    return db_bill

@router.get("/", response_model=List[schemas.BillResponse])
def get_bills(skip: int = 0, limit: int = 100, supabase: Client = Depends(get_supabase)):
    res = supabase.table('bills').select('*, bill_items(*)').order('bill_date', desc=True).range(skip, skip + limit - 1).execute()
    return res.data

@router.get("/{customer_id}/pending", response_model=dict)
def get_customer_pending_balance(customer_id: int, supabase: Client = Depends(get_supabase)):
    # Automatically calculate previous pending
    res = supabase.table('bills').select('pending_amount').eq('customer_id', customer_id).in_('status', ['unpaid', 'partially_paid']).execute()
    
    total_pending = sum(float(b['pending_amount']) for b in res.data)
    return {"customer_id": customer_id, "previous_pending": total_pending}

@router.put("/{bill_id}", response_model=schemas.BillResponse)
def update_bill(bill_id: int, bill_update: schemas.BillUpdate, supabase: Client = Depends(get_supabase)):
    res = supabase.table('bills').select('*').eq('id', bill_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    old_bill = res.data[0]
    
    # Update the bill itself
    update_data = {
        "status": bill_update.status,
        "paid_amount": bill_update.paid_amount,
        "pending_amount": bill_update.pending_amount
    }
    update_res = supabase.table('bills').update(update_data).eq('id', bill_id).execute()
    new_bill = update_res.data[0]
    
    # Calculate difference in pending amount to update customer's credit limit
    pending_diff = float(bill_update.pending_amount) - float(old_bill.get('pending_amount', 0))
    
    if pending_diff != 0:
        customer_id = old_bill.get('customer_id')
        if customer_id:
            customer_res = supabase.table('customers').select('credit_limit').eq('id', customer_id).execute()
            if customer_res.data:
                current_limit = float(customer_res.data[0].get('credit_limit') or 0)
                new_limit = current_limit + pending_diff
                supabase.table('customers').update({'credit_limit': new_limit}).eq('id', customer_id).execute()
                
    return new_bill
