from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
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

class PortalOrderItem(BaseModel):
    product_id: int
    quantity: float
    rate: float
    amount: float

class PortalOrderCreate(BaseModel):
    items: List[PortalOrderItem]
    total_amount: float
    language: str = "english"

class PortalOrderEditUpdate(BaseModel):
    items: List[PortalOrderItem]
    total_amount: float

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
    
    price_map = {int(cp['product_id']): float(cp['custom_price']) for cp in custom_prices_res.data}
    
    result = []
    for p in products:
        price = price_map.get(int(p['id']), float(p.get('default_selling_price', 0)))
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
    
    final_amount = float(order.total_amount)
    
    new_order = {
        "customer_id": customer['id'],
        "total_amount": final_amount,
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

    return {"message": "Order placed successfully", "order_id": db_order['id']}

@router.put("/orders/{order_id}/edit")
def edit_portal_order(
    order_id: int, 
    update: PortalOrderEditUpdate, 
    supabase: Client = Depends(get_supabase),
    current_user: schemas.UserResponse = Depends(auth.get_current_user)
):
    # Verify customer owns this order and it's pending
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="You are not registered as a customer.")
        
    order_res = supabase.table('orders').select('*').eq('id', order_id).eq('customer_id', customer_res.data[0]['id']).execute()
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order_res.data[0]['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Only pending orders can be edited.")

    # 1. Update the total_amount in the orders table
    supabase.table('orders').update({'total_amount': update.total_amount}).eq('id', order_id).execute()
    
    # 2. Delete existing order items
    supabase.table('order_items').delete().eq('order_id', order_id).execute()
    
    # 3. Insert new items
    if update.items:
        new_items = []
        for item in update.items:
            new_items.append({
                "order_id": order_id,
                "product_id": item.product_id,
                "quantity": float(item.quantity),
                "rate": float(item.rate),
                "amount": float(item.amount)
            })
        supabase.table('order_items').insert(new_items).execute()
        
    return {"message": "Order updated successfully"}

@router.post("/orders/{order_id}/email")
def trigger_order_email(
    order_id: int,
    supabase: Client = Depends(get_supabase),
    current_user: schemas.UserResponse = Depends(auth.get_current_user)
):
    # Verify customer
    customer_res = supabase.table('customers').select('*').eq('user_id', current_user.id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=403, detail="Not authorized")
    customer = customer_res.data[0]

    # Fetch order
    order_res = supabase.table('orders').select('*').eq('id', order_id).eq('customer_id', customer['id']).execute()
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = order_res.data[0]

    # Fetch items
    items_res = supabase.table('order_items').select('*, product:products(product_name)').eq('order_id', order_id).execute()
    email_items = []
    for item in (items_res.data or []):
        email_items.append({
            "product_name": item.get('product', {}).get('product_name', f"Product #{item['product_id']}"),
            "quantity": item['quantity'],
            "rate": item['rate'],
            "amount": item['amount']
        })

    # Send email synchronously to keep container alive
    _send_order_email(
        customer.get('customer_name', 'Customer'),
        customer.get('shop_name', ''),
        order['id'],
        email_items,
        float(order['total_amount'])
    )
    return {"message": "Email sent"}

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
    total_pending = float(customer.get('credit_limit') or 0.0)
    
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

@router.get("/test-email-error")
def test_email_error():
    import traceback
    try:
        _send_order_email("Test", "Test Shop", 999, [], 100.0)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}
