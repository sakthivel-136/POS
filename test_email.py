from backend.email_utils import _send_order_email

print("Sending test email synchronously...")
_send_order_email(
    customer_name="Test Customer",
    shop_name="Sakthi Test Shop",
    order_id=999,
    items=[
        {"product_name": "Test Spice 1", "quantity": 10, "rate": 50, "amount": 500},
        {"product_name": "Test Spice 2", "quantity": 5, "rate": 100, "amount": 500}
    ],
    total=1000.0
)
print("Test script finished.")
