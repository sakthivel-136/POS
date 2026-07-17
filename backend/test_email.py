import email_utils
import time

email_utils._send_order_email(
    customer_name="Test Customer",
    shop_name="Test Shop",
    order_id=999,
    items=[{"product_name": "Test", "quantity": 1, "rate": 10, "amount": 10}],
    total=10.0
)
