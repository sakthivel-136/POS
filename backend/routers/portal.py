from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from pydantic import BaseModel
from supabase import Client

import schemas, auth
from database import get_supabase
from email_utils import _send_order_email

router = APIRouter(
    prefix="/portal",
    tags=["Customer Portal"],
    dependencies=[Depends(auth.get_current_user)]
)

class PortalOrderCreate(BaseModel):
    items: List[schemas.BillItemCreate]
    total_amount: float
    language: str = "english" # tamil or english

@router.get("/my-prices", response_model=List[dict])
def get_my_prices(supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    # 1. Get the customer record linked to this user
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="You are not registered as a customer.")
    
    customer = customer_res.data[0]
    
    # 2. Get all products and overlay custom prices
    products_res = supabase.table('products').select('*').eq('status', 'active').execute()
    products = products_res.data
    
    custom_prices_res = supabase.table('customer_prices').select('*').eq('customer_id', customer['id']).execute()
    
    price_map = {cp['product_id']: float(cp['custom_price']) for cp in custom_prices_res.data}
    
    result = []
    for p in products:
        price = price_map.get(p['id'], float(p.get('default_selling_price', 0)))
        result.append({
            "product_id": p['id'],
            "product_name": p['product_name'],
            "tamil_name": p.get('tamil_name'),
            "price": price,
            "unit": p.get('unit')
        })
        
    return result

@router.post("/orders")
def place_order(
    order: PortalOrderCreate, 
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase), 
    current_user: schemas.UserResponse = Depends(auth.get_current_user)
):
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="You are not registered as a customer.")
        
    customer = customer_res.data[0]
        
    new_order = {
        "customer_id": customer['id'],
        "total_amount": float(order.total_amount),
        "status": "pending"
    }
    
    order_res = supabase.table('orders').insert(new_order).execute()
    db_order = order_res.data[0]
    
    for item in order.items:
        new_item = {
            "order_id": db_order['id'],
            "product_id": item.product_id,
            "quantity": float(item.quantity),
            "rate": float(item.rate),
            "amount": float(item.amount)
        }
        supabase.table('order_items').insert(new_item).execute()

    # Fetch product names for the email
    product_ids = [item.product_id for item in order.items]
    products_res = supabase.table('products').select('id, product_name').in_('id', product_ids).execute()
    product_map = {p['id']: p['product_name'] for p in (products_res.data or [])}

    email_items = [
        {
            "product_name": product_map.get(item.product_id, f"Product #{item.product_id}"),
            "quantity": item.quantity,
            "rate": item.rate,
            "amount": item.amount
        }
        for item in order.items
    ]

    # Fire email in background (non-blocking)
    background_tasks.add_task(
        _send_order_email,
        customer.get('customer_name', 'Customer'),
        customer.get('shop_name', ''),
        db_order['id'],
        email_items,
        float(order.total_amount)
    )

    return {"message": "Order placed successfully", "order_id": db_order['id']}

@router.get("/dashboard")
def get_portal_dashboard(supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="You are not registered as a customer.")
    
    customer = customer_res.data[0]
    
    # Calculate total purchases (sum of all bills)
    bills_res = supabase.table('bills').select('total_amount').eq('customer_id', customer['id']).execute()
    total_purchases = sum(float(b['total_amount']) for b in bills_res.data) if bills_res.data else 0
    
    # Calculate total pending
    pending_res = supabase.table('bills').select('pending_amount').eq('customer_id', customer['id']).eq('status', 'unpaid').execute()
    total_pending = sum(float(b['pending_amount']) for b in pending_res.data) if pending_res.data else 0
    
    # Include partially paid bills in pending calculation
    partial_res = supabase.table('bills').select('pending_amount').eq('customer_id', customer['id']).eq('status', 'partially_paid').execute()
    total_pending += sum(float(b['pending_amount']) for b in partial_res.data) if partial_res.data else 0
    
    return {
        "customer_name": customer['customer_name'],
        "shop_name": customer.get('shop_name'),
        "total_purchases": total_purchases,
        "pending_amount": total_pending,
        "credit_limit": float(customer.get('credit_limit') or 0)
    }

@router.get("/bills")
def get_portal_bills(supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="You are not registered as a customer.")
    
    customer = customer_res.data[0]
    
    bills_res = supabase.table('bills').select('*, bill_items(*, product:products(product_name, tamil_name))').eq('customer_id', customer['id']).order('bill_date', desc=True).execute()
    return bills_res.data

@router.get("/my-orders")
def get_portal_my_orders(supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="You are not registered as a customer.")
    
    customer = customer_res.data[0]
    
    orders_res = supabase.table('orders').select('*, order_items(*, product:products(product_name, tamil_name, unit))').eq('customer_id', customer['id']).order('created_at', desc=True).execute()
    return orders_res.data
