from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import pandas as pd
from io import BytesIO
from supabase import Client

from .. import auth
from ..database import get_supabase

router = APIRouter(
    prefix="/csv",
    tags=["CSV Import/Export"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.post("/upload")
async def upload_universal_csv(file: UploadFile = File(...), supabase: Client = Depends(get_supabase)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
        
    contents = await file.read()
    try:
        df = pd.read_csv(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    # We expect columns like: Type, Name, Phone/TamilName, Price/Pending, Stock
    # Type can be "Customer" or "Product"
    
    customers_added = 0
    products_added = 0
    
    for index, row in df.iterrows():
        # Clean column names by creating a case-insensitive lookup
        row_dict = {str(k).strip().lower(): v for k, v in row.items()}
        
        record_type = str(row_dict.get('type', '')).strip().lower()
        
        if record_type == 'customer':
            customer = {
                "customer_name": str(row_dict.get('name', 'Unknown')),
                "phone_number": str(row_dict.get('phone', '')),
                "address": str(row_dict.get('address', '')),
                "credit_limit": float(row_dict.get('balance', 0) or 0)
            }
            supabase.table('customers').insert(customer).execute()
            customers_added += 1
            
        elif record_type == 'product':
            product = {
                "product_name": str(row_dict.get('name', 'Unknown')),
                "tamil_name": str(row_dict.get('tamil_name', '')),
                "default_selling_price": float(row_dict.get('rate', 0) or 0),
                "unit": str(row_dict.get('unit', 'pcs'))
            }
            supabase.table('products').insert(product).execute()
            products_added += 1

    return {
        "message": "CSV Processed Successfully",
        "customers_added": customers_added,
        "products_added": products_added
    }
