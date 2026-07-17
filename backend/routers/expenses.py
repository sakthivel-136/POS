from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from typing import List, Optional
from pydantic import BaseModel
import database
import auth
import schemas

router = APIRouter(prefix="/expenses", tags=["Expenses"])

class ExpenseCreate(BaseModel):
    date: str
    category: str
    amount: float
    description: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    date: str
    category: str
    amount: float
    description: Optional[str] = None

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    expense: ExpenseCreate, 
    supabase: Client = Depends(database.get_supabase),
    current_admin: schemas.UserResponse = Depends(auth.get_current_active_admin)
):
    res = supabase.table('expenses').insert(expense.model_dump()).execute()
    return res.data[0]

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    supabase: Client = Depends(database.get_supabase),
    current_admin: schemas.UserResponse = Depends(auth.get_current_active_admin)
):
    res = supabase.table('expenses').select('*').order('date', desc=True).execute()
    return res.data

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    supabase: Client = Depends(database.get_supabase),
    current_admin: schemas.UserResponse = Depends(auth.get_current_active_admin)
):
    res = supabase.table('expenses').delete().eq('id', expense_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Deleted successfully"}
