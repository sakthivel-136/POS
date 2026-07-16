from fastapi import APIRouter, Depends, HTTPException
from typing import List
from supabase import Client

from .. import schemas, auth
from ..database import get_supabase

router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.post("/", response_model=schemas.CustomerResponse)
def create_customer(customer: schemas.CustomerCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table('customers').insert(customer.model_dump()).execute()
    return res.data[0]

@router.get("/", response_model=List[schemas.CustomerResponse])
def get_customers(skip: int = 0, limit: int = 100, supabase: Client = Depends(get_supabase)):
    res = supabase.table('customers').select('*, bills(pending_amount)').range(skip, skip + limit - 1).execute()
    customers = []
    for c in res.data:
        bills = c.pop('bills', [])
        c['current_balance'] = sum(float(b.get('pending_amount') or 0) for b in bills)
        customers.append(c)
    return customers

@router.get("/{customer_id}", response_model=schemas.CustomerResponse)
def get_customer(customer_id: int, supabase: Client = Depends(get_supabase)):
    res = supabase.table('customers').select('*, bills(pending_amount)').eq('id', customer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    c = res.data[0]
    bills = c.pop('bills', [])
    c['current_balance'] = sum(float(b.get('pending_amount') or 0) for b in bills)
    return c

@router.put("/{customer_id}", response_model=schemas.CustomerResponse)
def update_customer(customer_id: int, customer: schemas.CustomerCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table('customers').update(customer.model_dump()).eq('id', customer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    c = res.data[0]
    c['current_balance'] = 0.0 # Just returning the updated model, we don't need to recalculate balance here unless we join
    return c

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, supabase: Client = Depends(get_supabase)):
    res = supabase.table('customers').select('*').eq('id', customer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Delete related records in correct dependency order to avoid FK violations
    
    # 1. Delete order_items linked to this customer's orders
    orders_res = supabase.table('orders').select('id').eq('customer_id', customer_id).execute()
    for order in orders_res.data:
        supabase.table('order_items').delete().eq('order_id', order['id']).execute()
    
    # 2. Delete orders
    supabase.table('orders').delete().eq('customer_id', customer_id).execute()
    
    # 3. Delete bill_items linked to this customer's bills
    bills_res = supabase.table('bills').select('id').eq('customer_id', customer_id).execute()
    for bill in bills_res.data:
        supabase.table('bill_items').delete().eq('bill_id', bill['id']).execute()
        supabase.table('payments').delete().eq('bill_id', bill['id']).execute()
    
    # 4. Delete bills
    supabase.table('bills').delete().eq('customer_id', customer_id).execute()
    
    # 5. Delete custom prices
    supabase.table('customer_prices').delete().eq('customer_id', customer_id).execute()
    
    # 6. Finally delete the customer
    supabase.table('customers').delete().eq('id', customer_id).execute()
    
    return {"message": "Customer deleted successfully"}


# Customer Specific Pricing endpoints
@router.post("/{customer_id}/prices", response_model=schemas.CustomerPriceResponse)
def set_customer_price(customer_id: int, price: schemas.CustomerPriceCreate, supabase: Client = Depends(get_supabase)):
    customer_res = supabase.table('customers').select('*').eq('id', customer_id).execute()
    if not customer_res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    product_res = supabase.table('products').select('*').eq('id', price.product_id).execute()
    if not product_res.data:
        raise HTTPException(status_code=404, detail="Product not found")

    existing_price = supabase.table('customer_prices').select('*').eq('customer_id', customer_id).eq('product_id', price.product_id).execute()

    if existing_price.data:
        res = supabase.table('customer_prices').update({'custom_price': price.custom_price}).eq('id', existing_price.data[0]['id']).execute()
    else:
        new_price = {
            "customer_id": customer_id, 
            "product_id": price.product_id, 
            "custom_price": price.custom_price
        }
        res = supabase.table('customer_prices').insert(new_price).execute()

    return res.data[0]

@router.get("/{customer_id}/prices", response_model=List[schemas.CustomerPriceResponse])
def get_customer_prices(customer_id: int, supabase: Client = Depends(get_supabase)):
    res = supabase.table('customer_prices').select('*').eq('customer_id', customer_id).execute()
    return res.data

@router.get("/{customer_id}/bills", response_model=List[schemas.BillResponse])
def get_customer_bills(customer_id: int, supabase: Client = Depends(get_supabase)):
    res = supabase.table('bills').select('*, bill_items(*)').eq('customer_id', customer_id).order('bill_date', desc=True).execute()
    return res.data
