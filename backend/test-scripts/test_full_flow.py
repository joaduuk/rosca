import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

# Login
login_data = {
    "username": "joaduuk@yahoo.co.uk",
    "password": "Agyakojo47"
}
response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("✅ Logged in")

# 1. Create a group (auto-adds creator)
group_data = {
    "name": f"Family Savings Circle {uuid.uuid4().hex[:6]}",
    # "name": "Family Savings Circle",
    "description": "Monthly family savings",
    "contribution_amount": 50,
    "contribution_frequency": "monthly",
    "member_count": 4,
    "currency": "USD",
    "country_code": "US"
}
response = requests.post(f"{BASE_URL}/groups/", json=group_data, headers=headers)

if response.status_code != 200:
    print("❌ Failed to create group:", response.json())
    exit()

group = response.json()
group_id = group["id"]

print(f"✅ Created group: {group['name']} (ID: {group_id})")

# 2. List members (should see creator)
response = requests.get(f"{BASE_URL}/groups/{group_id}/members", headers=headers)
members = response.json()
print(f"\n📋 Members after creation ({len(members)}):")
for member in members:
    print(f"  • {member['name']} - Admin: {member['is_admin']}, Order: {member['payout_order']}")

# 3. Add another member (you'll need another user ID)
# First, get list of users (you might need an admin endpoint for this)
# For now, we'll simulate with a known user ID
another_user_id = "62e8e2a0-dde3-4e49-98c3-eb08d82ac413"

response = requests.post(
    f"{BASE_URL}/groups/{group_id}/members/{another_user_id}?is_admin=false",
    headers=headers
)

if response.status_code == 200:
    print(f"\n✅ Added another member")

    response = requests.get(f"{BASE_URL}/groups/{group_id}/members", headers=headers)
    members = response.json()

    print(f"\n📋 Updated members ({len(members)}):")
    for member in members:
        print(f"  • {member['name']} - Admin: {member['is_admin']}, Order: {member['payout_order']}")
else:
    print("❌ Failed to add member:", response.text)