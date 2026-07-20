from fastapi import APIRouter, Depends, HTTPException
from typing import List
from supabase import Client

import schemas, auth
from database import get_supabase

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(auth.get_current_user)]
)

@router.get("/", response_model=List[schemas.UserResponse])
def get_users(supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    # Restrict to SAKTHI user only
    if current_user.username.upper() != "SAKTHI":
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to manage staff")
        
    res = supabase.table('users').select('*').in_('role', ['admin', 'staff']).execute()
    return res.data

@router.put("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(user_id: int, role: str, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    # Restrict to SAKTHI user only
    if current_user.username.upper() != "SAKTHI":
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to manage staff")
        
    # Prevent changing SAKTHI's role
    user_res = supabase.table('users').select('*').eq('id', user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_res.data[0]['username'].upper() == "SAKTHI":
        raise HTTPException(status_code=403, detail="Cannot change master admin role")
        
    if role not in ["admin", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    res = supabase.table('users').update({'role': role}).eq('id', user_id).execute()
    return res.data[0]

@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user_details(user_id: int, request: schemas.UserUpdate, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    if current_user.username.upper() != "SAKTHI":
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to manage staff")
        
    user_res = supabase.table('users').select('*').eq('id', user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_res.data[0]['username'].upper() == "SAKTHI" and request.username.upper() != "SAKTHI":
        raise HTTPException(status_code=403, detail="Cannot change master admin username or status")
        
    res = supabase.table('users').update({
        'username': request.username,
        'status': request.status
    }).eq('id', user_id).execute()
    return res.data[0]

@router.put("/{user_id}/reset-password", response_model=schemas.UserResponse)
def reset_user_password(user_id: int, request: schemas.PasswordResetRequest, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    if current_user.username.upper() != "SAKTHI":
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to manage staff")
        
    user_res = supabase.table('users').select('*').eq('id', user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_res.data[0]['username'].upper() == "SAKTHI":
        raise HTTPException(status_code=403, detail="Cannot reset master admin password via this endpoint")
        
    hashed_pw = auth.get_password_hash(request.new_password)
    res = supabase.table('users').update({'password_hash': hashed_pw}).eq('id', user_id).execute()
    return res.data[0]

@router.delete("/{user_id}")
def delete_user(user_id: int, supabase: Client = Depends(get_supabase), current_user: schemas.UserResponse = Depends(auth.get_current_user)):
    if current_user.username.upper() != "SAKTHI":
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to manage staff")
        
    user_res = supabase.table('users').select('*').eq('id', user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_res.data[0]['username'].upper() == "SAKTHI":
        raise HTTPException(status_code=403, detail="Cannot delete master admin account")
        
    supabase.table('users').delete().eq('id', user_id).execute()
    return {"message": "User deleted successfully"}
