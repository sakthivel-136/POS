import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import threading

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "c.sakthivel1.3.2006@gmail.com"
SENDER_PASSWORD = "udkt umic ffwv kjym"
NOTIFY_EMAILS = ["c.sakthivel1.3.2006@gmail.com", "sakthirekha2007@gmail.com"]


def send_order_email_async(customer_name: str, shop_name: str, order_id: int, items: list, total: float):
    """Send email in a background thread so it doesn't block the API response."""
    thread = threading.Thread(target=_send_order_email, args=(customer_name, shop_name, order_id, items, total))
    thread.daemon = True
    thread.start()


def _send_order_email(customer_name: str, shop_name: str, order_id: int, items: list, total: float):
    try:
        store_display = shop_name if shop_name else customer_name
        subject = f"🛒 New Order #{order_id} from {store_display} — Sakthi Spices"

        rows_html = ""
        for i, item in enumerate(items):
            bg = "#f0fdf4" if i % 2 == 0 else "#ffffff"
            rows_html += f"""
            <tr style="background:{bg}">
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151">{item['product_name']}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;color:#374151">{item['quantity']}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#374151">₹{item['rate']}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:700;color:#166534">₹{item['amount']}</td>
            </tr>"""

        html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 28px;text-align:center">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;padding:12px;margin-bottom:12px">
        <span style="font-size:32px">🛒</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">New Customer Order!</h1>
      <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px">Sakthi Spices Wholesale Portal</p>
    </div>

    <!-- Order Info -->
    <div style="padding:24px 28px;background:#f0fdf4;border-bottom:2px solid #bbf7d0">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Order ID</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#166534">#ORDER-{order_id}</p>
        </div>
        <div>
          <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Store / Customer</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1f2937">{store_display}</p>
          {f'<p style="margin:2px 0 0;font-size:13px;color:#6b7280">{customer_name}</p>' if shop_name else ''}
        </div>
      </div>
    </div>

    <!-- Order Items -->
    <div style="padding:24px 28px">
      <h2 style="margin:0 0 16px;font-size:16px;color:#374151;font-weight:700">📦 Order Items</h2>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <thead>
          <tr style="background:#1a1752">
            <th style="padding:12px 16px;text-align:left;color:#ffffff;font-size:13px;font-weight:600">Product</th>
            <th style="padding:12px 16px;text-align:center;color:#ffffff;font-size:13px;font-weight:600">Qty</th>
            <th style="padding:12px 16px;text-align:right;color:#ffffff;font-size:13px;font-weight:600">Rate</th>
            <th style="padding:12px 16px;text-align:right;color:#ffffff;font-size:13px;font-weight:600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows_html}
        </tbody>
      </table>
    </div>

    <!-- Total -->
    <div style="margin:0 28px 24px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:12px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#ffffff;font-size:16px;font-weight:600">Total Order Value</span>
      <span style="color:#ffffff;font-size:28px;font-weight:800">₹{total:.2f}</span>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:0 28px 28px">
      <p style="margin:0 0 16px;color:#6b7280;font-size:14px">Please log in to the ERP to process this order.</p>
      <a href="https://bill.sakthi-dev.in/orders" style="display:inline-block;background:#1a1752;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
        View in ERP &rarr;
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 28px;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">Sakthi Spices Wholesale ERP &bull; Automatic notification</p>
    </div>
  </div>
</body>
</html>"""

        import json
        import urllib.request
        
        RESEND_API_KEY = "re_J3i3vGYk_Jys69tng5r4XSHE8Kv6X4NZv"
        
        data = {
            "from": "Sakthi Spices ERP <onboarding@resend.dev>",
            "to": NOTIFY_EMAILS,
            "subject": subject,
            "html": html_body
        }
        
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            response.read()

        print(f"[EMAIL] Order #{order_id} notification sent to {NOTIFY_EMAILS} via Resend")

    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send order notification: {e}")
