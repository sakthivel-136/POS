from fastapi import APIRouter, Depends
from datetime import datetime, date, timedelta
from typing import Optional
from collections import defaultdict
from supabase import Client

from .. import auth
from ..database import get_supabase

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.get("/stock")
def get_stock_report(supabase: Client = Depends(get_supabase)):
    products = supabase.table('products').select('*').execute().data
    return [{
        "product_id": p['id'],
        "product_name": p['product_name'],
        "tamil_name": p.get('tamil_name'),
        "current_stock": float(p.get('current_stock', 0) or 0),
        "stock_status": "Low" if float(p.get('current_stock', 0) or 0) < 50 else "Good"
    } for p in products]

@router.get("/sales")
def get_sales_report(start_date: Optional[date] = None, end_date: Optional[date] = None, supabase: Client = Depends(get_supabase)):
    bills = supabase.table('bills').select('*, customer:customers(customer_name, shop_name, phone_number)').order('bill_date', desc=True).execute().data
    
    if start_date:
        bills = [b for b in bills if (b.get('bill_date') or '')[:10] >= start_date.isoformat()]
    if end_date:
        bills = [b for b in bills if (b.get('bill_date') or '')[:10] <= end_date.isoformat()]
        
    return bills

@router.get("/sales/daily")
def get_daily_sales_report(supabase: Client = Depends(get_supabase)):
    # Returns sales grouped by day for the last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    
    bills = supabase.table('bills').select('*').execute().data
    recent_bills = [b for b in bills if (b.get('bill_date') or '')[:10] >= thirty_days_ago.isoformat()]
    
    daily_stats = defaultdict(lambda: {"sales": 0, "collections": 0})
    for b in recent_bills:
        day = (b.get('bill_date') or '')[:10]
        daily_stats[day]["sales"] += float(b['total_amount'])
        daily_stats[day]["collections"] += float(b.get('paid_amount', 0))
        
    sorted_days = sorted(daily_stats.keys())
    return [{"date": day, "sales": daily_stats[day]["sales"], "collections": daily_stats[day]["collections"]} for day in sorted_days]

@router.get("/products/top")
def get_top_selling_products(supabase: Client = Depends(get_supabase)):
    bill_items = supabase.table('bill_items').select('*').execute().data
    
    product_stats = defaultdict(lambda: {"total_sold": 0, "total_revenue": 0})
    for item in bill_items:
        pid = item['product_id']
        product_stats[pid]["total_sold"] += float(item['quantity'])
        product_stats[pid]["total_revenue"] += float(item['amount'])
        
    # Sort by total_sold desc
    sorted_pids = sorted(product_stats.keys(), key=lambda pid: product_stats[pid]["total_sold"], reverse=True)[:10]
    
    result = []
    if sorted_pids:
        products = supabase.table('products').select('*').in_('id', sorted_pids).execute().data
        p_dict = {p['id']: p for p in products}
        
        for pid in sorted_pids:
            if pid in p_dict:
                result.append({
                    "product_name": p_dict[pid]['product_name'],
                    "total_sold": product_stats[pid]["total_sold"],
                    "total_revenue": product_stats[pid]["total_revenue"]
                })
            
    return result

@router.get("/customers/outstanding")
def get_outstanding_report(supabase: Client = Depends(get_supabase)):
    bills = supabase.table('bills').select('*').in_('status', ['unpaid', 'partially_paid']).execute().data
    
    customer_pending = defaultdict(float)
    for b in bills:
        customer_pending[b['customer_id']] += float(b.get('pending_amount', 0))
        
    # Filter > 0 and sort
    pending_cids = {cid: amt for cid, amt in customer_pending.items() if amt > 0}
    sorted_cids = sorted(pending_cids.keys(), key=lambda cid: pending_cids[cid], reverse=True)
    
    result = []
    if sorted_cids:
        customers = supabase.table('customers').select('*').in_('id', sorted_cids).execute().data
        c_dict = {c['id']: c for c in customers}
        
        for cid in sorted_cids:
            if cid in c_dict:
                c = c_dict[cid]
                result.append({
                    "customer_name": c['customer_name'],
                    "shop_name": c.get('shop_name'),
                    "phone": c.get('phone_number'),
                    "total_pending": pending_cids[cid]
                })
            
    return result
