from fastapi import APIRouter, Depends, HTTPException
from typing import List
from supabase import Client

import schemas, auth
from database import get_supabase

router = APIRouter(
    prefix="/products",
    tags=["Products"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.post("", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table('products').insert(product.model_dump()).execute()
    return res.data[0]

@router.get("", response_model=List[schemas.ProductResponse])
def get_products(skip: int = 0, limit: int = 100, supabase: Client = Depends(get_supabase)):
    # Supabase uses range for pagination
    res = supabase.table('products').select('*').range(skip, skip + limit - 1).execute()
    return res.data

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, supabase: Client = Depends(get_supabase)):
    res = supabase.table('products').select('*').eq('id', product_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return res.data[0]

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product: schemas.ProductCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table('products').select('*').eq('id', product_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product.model_dump(exclude_unset=True)
    update_res = supabase.table('products').update(update_data).eq('id', product_id).execute()
    return update_res.data[0]

@router.delete("/{product_id}")
def delete_product(product_id: int, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_active_admin)):
    # Only admins can delete products
    res = supabase.table('products').select('*').eq('id', product_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    
    supabase.table('products').delete().eq('id', product_id).execute()
    return {"message": "Product deleted successfully"}
