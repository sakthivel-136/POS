import urllib.request
import json
import sys
import os

sys.path.append('/Users/rekha/.gemini/antigravity/scratch/sakthi_spices_erp/backend')
from auth import create_access_token

token = create_access_token({"sub": "admin"})

payload = {
  "customer_id": 1,
  "status": "unpaid",
  "total_amount": 5795.0,
  "paid_amount": 0.0,
  "pending_amount": 5795.0,
  "items": [
    {
      "product_id": 1,
      "quantity": 50,
      "rate": 24,
      "amount": 1200
    }
  ]
}

req = urllib.request.Request('http://localhost:8000/billing/12/full', method='PUT')
req.add_header('Authorization', f'Bearer {token}')
req.add_header('Content-Type', 'application/json')
try:
    with urllib.request.urlopen(req, data=json.dumps(payload).encode('utf-8')) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode('utf-8')}")
