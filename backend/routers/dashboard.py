from fastapi import APIRouter, Depends
from datetime import datetime, date, timedelta
from supabase import Client

import auth
from database import get_supabase

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.get("/kpis")
def get_dashboard_kpis(supabase: Client = Depends(get_supabase)):
    today_str = date.today().isoformat()
    
    # Fetch all bills
    bills_res = supabase.table('bills').select('*').execute()
    all_bills = bills_res.data
    
    # Today's Sales
    todays_bills = [b for b in all_bills if b.get('bill_date', '').startswith(today_str)]
    
    todays_sales = sum(float(b['total_amount']) for b in todays_bills)
    todays_collection = sum(float(b.get('paid_amount', 0)) for b in todays_bills)
    todays_pending = sum(float(b.get('pending_amount', 0)) for b in todays_bills)
    
    # This Month Sales
    this_month_str = today_str[:7] # e.g. '2026-07'
    this_month_bills = [b for b in all_bills if b.get('bill_date', '').startswith(this_month_str)]
    this_month_sales = sum(float(b['total_amount']) for b in this_month_bills)
    
    # Last Month Sales
    today_date = date.today()
    last_month_date = today_date.replace(day=1) - timedelta(days=1)
    last_month_str = last_month_date.isoformat()[:7] # e.g. '2026-06'
    last_month_bills = [b for b in all_bills if b.get('bill_date', '').startswith(last_month_str)]
    last_month_sales = sum(float(b['total_amount']) for b in last_month_bills)
    
    if last_month_sales > 0:
        month_growth_pct = ((this_month_sales - last_month_sales) / last_month_sales) * 100
    else:
        month_growth_pct = 100.0 if this_month_sales > 0 else 0.0
    
    # Total Sales
    total_sales = sum(float(b['total_amount']) for b in all_bills)
    
    # Total Customers & Products
    total_customers = len(supabase.table('customers').select('id').execute().data)
    
    products_res = supabase.table('products').select('*').execute()
    products = products_res.data
    total_products = len(products)
    
    # Stock Value
    total_stock_value = sum(float(p.get('current_stock', 0) or 0) * float(p.get('purchase_price') or p.get('default_selling_price', 0)) for p in products)
    
    # Low stock & Out of stock
    low_stock_count = sum(1 for p in products if float(p.get('current_stock', 0) or 0) <= float(p.get('minimum_stock', 0) or 0) and float(p.get('current_stock', 0) or 0) > 0)
    out_of_stock_count = sum(1 for p in products if float(p.get('current_stock', 0) or 0) <= 0)
    
    # Total Outstanding
    total_outstanding = sum(float(b['pending_amount']) for b in all_bills if b.get('status') in ["unpaid", "partially_paid"])

    # 7-day sales data for Area Chart
    sales_data = []
    for i in range(6, -1, -1):
        target_date = date.today() - timedelta(days=i)
        target_str = target_date.isoformat()
        
        day_bills = [b for b in all_bills if b.get('bill_date', '').startswith(target_str)]
        
        day_sales = sum(float(b['total_amount']) for b in day_bills)
        day_collection = sum(float(b.get('paid_amount', 0)) for b in day_bills)
        
        sales_data.append({
            "name": target_date.strftime("%a"), # e.g. 'Mon', 'Tue'
            "sales": day_sales,
            "collection": day_collection
        })

    return {
        "todays_sales": todays_sales,
        "this_month_sales": this_month_sales,
        "last_month_sales": last_month_sales,
        "month_growth_pct": round(month_growth_pct, 1),
        "total_sales": total_sales,
        "todays_collection": todays_collection,
        "todays_bills_count": len(todays_bills),
        "todays_pending": todays_pending,
        "total_customers": total_customers,
        "total_products": total_products,
        "total_stock_value": total_stock_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "total_outstanding": total_outstanding,
        "salesData": sales_data
    }
