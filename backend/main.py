from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from supabase import Client
from datetime import timedelta
from typing import List

from . import schemas, auth
from .database import get_supabase
from .routers import products, customers, stock, billing, payments, portal, dashboard, reports, import_export, orders

app = FastAPI(title="Sakthi Spices ERP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://bill.sakthi-dev.in", "http://bill.sakthi-dev.in"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(stock.router)
app.include_router(billing.router)
app.include_router(payments.router)
app.include_router(portal.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(import_export.router)
app.include_router(orders.router)

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), supabase: Client = Depends(get_supabase)):
    phone = form_data.username
    
    # Try finding a customer by any of their 5 phone numbers
    customer_response = supabase.table('customers').select('*').or_(f"phone_number.eq.{phone},phone_number_2.eq.{phone},phone_number_3.eq.{phone},phone_number_4.eq.{phone},phone_number_5.eq.{phone}").execute()
    
    user = None
    found_customer = None
    if customer_response.data and len(customer_response.data) > 0:
        found_customer = customer_response.data[0]
        user_id = found_customer.get('user_id')
        if user_id:
            user_res = supabase.table('users').select('*').eq('id', user_id).execute()
            user = user_res.data[0] if user_res.data else None
            
    if not user:
        # Fallback to direct username lookup
        response = supabase.table('users').select('*').eq('username', phone).execute()
        user = response.data[0] if response.data else None
        # If we found the user this way but the customer had no user_id, auto-link them
        if user and found_customer and not found_customer.get('user_id'):
            supabase.table('customers').update({'user_id': user['id']}).eq('id', found_customer['id']).execute()
    
    # Automatic Registration on first login if it doesn't exist
    if not user:
        if form_data.username.upper() == "SAKTHI":
            if form_data.password != "Sycorax@136" and form_data.password != "SAKTHI":
                raise HTTPException(status_code=401, detail="Invalid admin credentials")
            role = "admin"
            status = "active"
            hashed_pw = auth.get_password_hash(form_data.password)
        else:
            role = "staff"
            status = "pending"
            hashed_pw = None
        
        new_user = {
            "username": form_data.username,
            "role": role,
            "status": status,
            "password_hash": hashed_pw
        }
        try:
            res = supabase.table('users').insert(new_user).execute()
        except Exception as e:
            if '23505' in str(e) and 'users_pkey' in str(e):
                # Supabase Postgres sequence is out of sync, manually assign ID
                max_id_res = supabase.table('users').select('id').order('id', desc=True).limit(1).execute()
                max_id = max_id_res.data[0]['id'] if max_id_res.data else 0
                new_user['id'] = max_id + 1
                res = supabase.table('users').insert(new_user).execute()
            else:
                raise e
        user = res.data[0]
    else:
        # Verify password if user exists (mainly for admin)
        if user.get('password_hash') and not auth.verify_password(form_data.password, user.get('password_hash')):
            raise HTTPException(status_code=401, detail="Incorrect password")
            
    if user.get('status') == "pending":
        raise HTTPException(status_code=403, detail="Account pending admin approval")
    if user.get('status') == "rejected":
        raise HTTPException(status_code=403, detail="Account rejected")
            
    # Set a long expiry time for persistent login (1 year)
    access_token_expires = timedelta(minutes=auth.settings.access_token_expire_minutes)
    access_token = auth.create_access_token(
        data={"sub": user.get('username')}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    return current_user

@app.get("/admin/pending_users")
def get_pending_users(supabase: Client = Depends(get_supabase), current_admin: schemas.UserResponse = Depends(auth.get_current_active_admin)):
    res = supabase.table('users').select('*').eq('status', 'pending').execute()
    return res.data

@app.post("/admin/approve_user/{user_id}")
def approve_user(user_id: int, action: str, role: str = "staff", supabase: Client = Depends(get_supabase), current_admin: schemas.UserResponse = Depends(auth.get_current_active_admin)):
    # action can be 'approve' or 'reject'
    res = supabase.table('users').select('*').eq('id', user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user = res.data[0]
        
    if action == "approve":
        supabase.table('users').update({'status': 'active', 'role': role}).eq('id', user_id).execute()
        # If customer role, link to existing or create new
        if role == "customer":
            phone = target_user['username']
            existing_res = supabase.table('customers').select('*').or_(f"phone_number.eq.{phone},phone_number_2.eq.{phone},phone_number_3.eq.{phone},phone_number_4.eq.{phone},phone_number_5.eq.{phone}").execute()
            
            if existing_res.data:
                existing_customer = existing_res.data[0]
                supabase.table('customers').update({'user_id': user_id}).eq('id', existing_customer['id']).execute()
            else:
                customer = {
                    "user_id": user_id,
                    "customer_name": target_user['username'],
                    "phone_number": target_user['username']
                }
                supabase.table('customers').insert(customer).execute()
    elif action == "reject":
        supabase.table('users').update({'status': 'rejected'}).eq('id', user_id).execute()
        
    return {"message": f"User {action}d successfully"}
