from fastapi import APIRouter, Depends, HTTPException
from typing import List
from supabase import Client

import schemas, auth
from database import get_supabase

router = APIRouter(
    prefix="/stock",
    tags=["Stock"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.post("/transaction", response_model=schemas.StockTransactionResponse)
def create_stock_transaction(transaction: schemas.StockTransactionCreate, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    product_res = supabase.table('products').select('*').eq('id', transaction.product_id).execute()
    if not product_res.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = product_res.data[0]
    new_stock = float(product['current_stock'])

    # Update product current_stock based on transaction type
    if transaction.transaction_type in ["purchase", "return", "opening"]:
        new_stock += float(transaction.quantity)
    elif transaction.transaction_type in ["sale", "damage"]:
        new_stock -= float(transaction.quantity)
    elif transaction.transaction_type == "adjustment":
        new_stock += float(transaction.quantity)
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type")

    # Update product stock
    supabase.table('products').update({'current_stock': new_stock}).eq('id', transaction.product_id).execute()

    # Create transaction record
    new_transaction = transaction.model_dump()
    new_transaction['user_id'] = current_user.id
    res = supabase.table('stock_transactions').insert(new_transaction).execute()
    
    return res.data[0]

@router.get("/transactions", response_model=List[schemas.StockTransactionResponse])
def get_stock_transactions(skip: int = 0, limit: int = 100, supabase: Client = Depends(get_supabase)):
    res = supabase.table('stock_transactions').select('*').order('transaction_date', desc=True).range(skip, skip + limit - 1).execute()
    return res.data
