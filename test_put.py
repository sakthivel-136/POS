import urllib.request
import json
import sys
import os

sys.path.append('/Users/rekha/.gemini/antigravity/scratch/sakthi_spices_erp/backend')
from auth import create_access_token

token = create_access_token({"sub": "admin"})

req = urllib.request.Request('http://localhost:8000/billing/12/full', method='PUT')
req.add_header('Authorization', 'Bearer ' + token)
req.add_header('Content-Type', 'application/json')
data = {
    'customer_id': 3,
    'status': 'unpaid',
    'total_amount': 5760,
    'paid_amount': 0,
    'pending_amount': 5760,
    'items': [{'product_id': 9, 'quantity': 50, 'rate': 24, 'amount': 1200}]
}
try:
    res = urllib.request.urlopen(req, data=json.dumps(data).encode('utf-8'))
    print(res.read().decode())
except Exception as e:
    print(e.read().decode() if hasattr(e, 'read') else str(e))
