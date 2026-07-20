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
