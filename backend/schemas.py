from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class PasswordResetRequest(BaseModel):
    new_password: str

class UserUpdate(BaseModel):
    username: str
    status: str

# Product Schemas
class ProductBase(BaseModel):
    product_name: str
    tamil_name: Optional[str] = None
    category: Optional[str] = None
    default_selling_price: float
    purchase_price: Optional[float] = None
    current_stock: Optional[float] = 0.00
    minimum_stock: Optional[float] = 0.00
    unit: Optional[str] = None
    status: Optional[str] = "active"

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Customer Pricing Schema
class CustomerPriceBase(BaseModel):
    product_id: int
    custom_price: float

class CustomerPriceCreate(CustomerPriceBase):
    pass

class CustomerPriceResponse(CustomerPriceBase):
    id: int
    
    class Config:
        from_attributes = True

# Customer Schemas
class CustomerBase(BaseModel):
    customer_name: str
    shop_name: Optional[str] = None
    place: Optional[str] = None
    phone_number: Optional[str] = None
    phone_number_2: Optional[str] = None
    phone_number_3: Optional[str] = None
    phone_number_4: Optional[str] = None
    phone_number_5: Optional[str] = None
    gst: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Optional[float] = 0.00
    status: Optional[str] = "active"

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    current_balance: Optional[float] = 0.00
    
    class Config:
        from_attributes = True

# Stock Schemas
class StockTransactionBase(BaseModel):
    product_id: int
    transaction_type: str # purchase, sale, adjustment, damage
    quantity: float
    reason: Optional[str] = None
    remarks: Optional[str] = None

class StockTransactionCreate(StockTransactionBase):
    pass

class StockTransactionResponse(StockTransactionBase):
    id: int
    transaction_date: datetime
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

# Billing Schemas
class BillItemBase(BaseModel):
    product_id: int
    quantity: float
    rate: float
    amount: float

class BillItemCreate(BillItemBase):
    pass

class BillItemResponse(BillItemBase):
    id: int
    bill_id: int

    class Config:
        from_attributes = True

class BillBase(BaseModel):
    customer_id: int
    total_amount: float
    paid_amount: Optional[float] = 0.00
    pending_amount: float
    status: Optional[str] = "unpaid"

class BillCreate(BillBase):
    items: List[BillItemCreate]

class BillUpdate(BaseModel):
    status: str
    paid_amount: float
    pending_amount: float

class BillFullUpdate(BillBase):
    items: List[BillItemCreate]

class BillResponse(BillBase):
    id: int
    bill_date: datetime
    created_by: Optional[int] = None
    items: List[BillItemResponse] = []

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    customer_id: int
    amount: float
    payment_mode: str
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    payment_date: datetime
    received_by: Optional[int] = None

    class Config:
        from_attributes = True
