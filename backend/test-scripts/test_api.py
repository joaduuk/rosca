import requests
import json
from uuid import UUID

BASE_URL = "http://localhost:8000"

# 1. Login
login_data = {
    "username": "joaduuk@yahoo.co.uk",  # Use the email you registered
    "password": "Agyakojo47"
}
response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
token = response.json()["access_token"]
print(f"✅ Login successful, token: {token[:20]}...")

headers = {"Authorization": f"Bearer {token}"}

# 2. Create a group
group_data = {
    "name": "HH Ghana ROSCA",
    "description": "Test group",
    "contribution_amount": 400,
    "contribution_frequency": "monthly",
    "member_count": 14,
    "currency": "GBP",
    "country_code": "UK"
}
response = requests.post(f"{BASE_URL}/groups/", json=group_data, headers=headers)
group = response.json()
print(f"✅ Group created: {group['name']} (ID: {group['id']})")

# Save group ID for later use
group_id = group['id']

# Note: You'll need to add members to the group first
# This would be done via a POST /groups/{group_id}/members/{user_id} endpoint
# For now, we'll assume you have a membership_id from your database

# 3. Record a contribution (once you have members)
# membership_id = "your-membership-uuid-from-db"
# contribution_data = {
#     "membership_id": membership_id,
#     "amount": 100,
#     "currency": "USD",
#     "due_date": "2024-03-15T00:00:00",
#     "status": "paid",
#     "payment_method": "cash"
# }
# response = requests.post(
#     f"{BASE_URL}/contributions/", 
#     json=contribution_data, 
#     headers=headers
# )
# print("✅ Contribution recorded:", response.json())

# 4. Get all groups (to verify)
response = requests.get(f"{BASE_URL}/groups/", headers=headers)
print(f"✅ Total groups: {len(response.json())}")