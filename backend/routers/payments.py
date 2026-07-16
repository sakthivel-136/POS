from fastapi import APIRouter, Depends, HTTPException
from typing import List
from supabase import Client

from .. import schemas, auth
from ..database import get_supabase

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.post("/", response_model=schemas.PaymentResponse)
def receive_payment(payment: schemas.PaymentCreate, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    # 1. Record the payment receipt
    payment_data = payment.model_dump()
    payment_data['received_by'] = current_user.id
    
    pay_res = supabase.table('payments').insert(payment_data).execute()
    db_payment = pay_res.data[0]

    # 2. FIFO Payment Allocation
    remaining_payment = float(payment.amount)
    
    # Get all unpaid or partially paid bills for this customer, ordered by oldest first
    bills_res = supabase.table('bills').select('*').eq('customer_id', payment.customer_id).in_('status', ['unpaid', 'partially_paid']).order('bill_date', desc=False).execute()

    for bill in bills_res.data:
        if remaining_payment <= 0:
            break
            
        pending_amt = float(bill['pending_amount'])
        paid_amt = float(bill.get('paid_amount', 0))
        
        if remaining_payment >= pending_amt:
            # Fully pay this bill
            remaining_payment -= pending_amt
            new_paid = paid_amt + pending_amt
            supabase.table('bills').update({
                'paid_amount': new_paid,
                'pending_amount': 0,
                'status': 'paid'
            }).eq('id', bill['id']).execute()
        else:
            # Partially pay this bill
            new_paid = paid_amt + remaining_payment
            new_pending = pending_amt - remaining_payment
            supabase.table('bills').update({
                'paid_amount': new_paid,
                'pending_amount': new_pending,
                'status': 'partially_paid'
            }).eq('id', bill['id']).execute()
            remaining_payment = 0

    return db_payment

@router.get("/{customer_id}/ledger", response_model=List[dict])
def get_customer_ledger(customer_id: int, supabase: Client = Depends(get_supabase)):
    # Simple ledger combining bills and payments
    bills_res = supabase.table('bills').select('*').eq('customer_id', customer_id).execute()
    payments_res = supabase.table('payments').select('*').eq('customer_id', customer_id).execute()
    
    ledger = []
    for b in bills_res.data:
        ledger.append({
            "date": b['bill_date'],
            "type": "bill",
            "ref_id": b['id'],
            "amount": b['total_amount'],
            "pending": b['pending_amount']
        })
    for p in payments_res.data:
        ledger.append({
            "date": p['payment_date'],
            "type": "payment",
            "ref_id": p['id'],
            "amount": p['amount'],
            "mode": p['payment_mode']
        })
        
    # Sort by date
    ledger.sort(key=lambda x: x["date"])
    return ledger
