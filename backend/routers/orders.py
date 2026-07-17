from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from supabase import Client
from datetime import datetime

import schemas, auth
from database import get_supabase

router = APIRouter(
    prefix="/orders",
    tags=["Admin Orders"],
    dependencies=[Depends(auth.get_current_active_admin)]
)

class OrderProcessUpdate(BaseModel):
    status: str  # "delivered", "rejected", "pending"
    payment_status: str = "unpaid"  # "unpaid", "partially_paid", "paid"
    amount_paid: float = 0.0

class OrderItemEdit(BaseModel):
    product_id: int
    quantity: float
    rate: float
    amount: float

class OrderEditUpdate(BaseModel):
    items: List[OrderItemEdit]
    total_amount: float

@router.get("/")
def get_all_orders(supabase: Client = Depends(get_supabase)):
    # Fetch orders with their customer and items
    res = supabase.table('orders').select('*, customer:customers(*), order_items(*, product:products(product_name, tamil_name))').order('created_at', desc=True).execute()
    return res.data

@router.put("/{order_id}/edit")
def edit_order(order_id: int, update: OrderEditUpdate, supabase: Client = Depends(get_supabase)):
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

@router.put("/{order_id}/process")
def process_order(order_id: int, update: OrderProcessUpdate, supabase: Client = Depends(get_supabase), admin: schemas.UserResponse = Depends(auth.get_current_active_admin)):
    # Fetch the order
    order_res = supabase.table('orders').select('*').eq('id', order_id).execute()
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = order_res.data[0]
    
    # If delivering the order, create a Bill with payment details
    if update.status == "delivered" and order['status'] != "delivered":
        # Bypass sequence issues by explicitly fetching max ID
        max_id_res = supabase.table('bills').select('id').order('id', desc=True).limit(1).execute()
        next_id = (max_id_res.data[0]['id'] + 1) if max_id_res.data else 1

        total = float(order['total_amount'])
        paid = float(update.amount_paid)
        pending = total - paid
        
        if paid >= total:
            bill_status = "paid"
            paid = total
            pending = 0.0
        elif paid > 0:
            bill_status = "partially_paid"
        else:
            bill_status = "unpaid"

        # Create a bill from this order
        new_bill = {
            "id": next_id,
            "customer_id": order['customer_id'],
            "total_amount": total,
            "paid_amount": paid,
            "pending_amount": pending,
            "status": bill_status,
            "created_by": admin.id
        }
        bill_res = supabase.table('bills').insert(new_bill).execute()
        bill = bill_res.data[0]
        
        # Copy order items to bill items
        items_res = supabase.table('order_items').select('*').eq('order_id', order_id).execute()
        for item in items_res.data:
            new_bill_item = {
                "bill_id": bill['id'],
                "product_id": item['product_id'],
                "quantity": float(item['quantity']),
                "rate": float(item['rate']),
                "amount": float(item['amount'])
            }
            supabase.table('bill_items').insert(new_bill_item).execute()
            
            # Reduce stock
            stock_tx = {
                "product_id": item['product_id'],
                "transaction_type": "sale",
                "quantity": float(item['quantity']),
                "reason": f"Bill #{bill['id']} from Portal Order #{order_id}",
                "user_id": admin.id
            }
            supabase.table('stock_transactions').insert(stock_tx).execute()
            
            # Update product current stock
            p_res = supabase.table('products').select('current_stock').eq('id', item['product_id']).execute()
            if p_res.data:
                curr_stock = float(p_res.data[0].get('current_stock') or 0)
                new_stock = curr_stock - float(item['quantity'])
                supabase.table('products').update({'current_stock': new_stock}).eq('id', item['product_id']).execute()
                
        # Update customer credit limit (pending balance increases)
        c_res = supabase.table('customers').select('credit_limit').eq('id', order['customer_id']).execute()
        if c_res.data:
            curr_limit = float(c_res.data[0].get('credit_limit') or 0)
            new_limit = curr_limit + float(order['total_amount'])
            supabase.table('customers').update({'credit_limit': new_limit}).eq('id', order['customer_id']).execute()
            
    # Update order status
    supabase.table('orders').update({
        'status': update.status
    }).eq('id', order_id).execute()
    
    return {"message": f"Order {update.status} successfully"}
