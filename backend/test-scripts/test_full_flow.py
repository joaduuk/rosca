# C:\proof\rosca\backend\test-scripts\test_full_flow.py

import requests
import json
import random
import string
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test user credentials
TEST_USER = {
    "email": f"test_user_{random.randint(1000, 9999)}@example.com",
    "password": "Test123!",
    "full_name": "Test User",
    "phone": f"+123456{random.randint(1000, 9999)}"
}

def random_group_name():
    """Generate random group name"""
    adjectives = ["Family", "Community", "Savings", "Investment", "Growth"]
    nouns = ["Circle", "Group", "Fund", "Society", "Association"]
    return f"{random.choice(adjectives)} {random.choice(nouns)} {random.randint(100, 999)}"

def print_response(response, label):
    """Helper to print response details"""
    print(f"{label}: Status {response.status_code}")
    if response.status_code >= 400:
        print(f"Error: {response.text}")
    return response

# Create a session
session = requests.Session()

# Step 1: Register user
print("\n📝 Registering user...")
register_response = session.post(
    f"{BASE_URL}/auth/register",
    json=TEST_USER
)

if register_response.status_code == 200:
    print("✅ User registered")
else:
    print(f"❌ Registration failed: {register_response.text}")
    # Try to login if user already exists
    print("Attempting to login...")
    login_response = session.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
    )
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        exit(1)
    print("✅ Logged in (existing user)")

# Step 2: Create a group
print("\n📦 Creating group...")
group_data = {
    "name": random_group_name(),
    "description": "Test group for full flow validation",
    "contribution_amount": 100.0,
    "contribution_period": "weekly",
    "member_count": 5,
    "rosca_type": "random"
}

create_group_response = session.post(
    f"{BASE_URL}/groups/",
    json=group_data
)

if create_group_response.status_code != 200:
    print(f"❌ Group creation failed: {create_group_response.text}")
    exit(1)

group = create_group_response.json()
print(f"✅ Created group: {group['name']} (ID: {group['id']})")

# Step 3: Check group members (should have creator as member)
print(f"\n📋 Members after creation:")
members_response = session.get(
    f"{BASE_URL}/groups/{group['id']}/members"
)

if members_response.status_code != 200:
    print(f"❌ Failed to get members: {members_response.text}")
else:
    members = members_response.json()
    print(f"Total members: {len(members)}")
    
    # Updated to match your API response structure
    for i, member in enumerate(members, 1):
        print(f"  {i}. {member.get('user_name', 'Unknown')} - "
              f"Admin: {member.get('is_admin', False)}, "
              f"Order: {member.get('payout_order', 'N/A')}")

# Step 4: Register and add another member
print("\n👥 Adding new member...")

# Create another test user
new_user = {
    "email": f"member_{random.randint(1000, 9999)}@example.com",
    "password": "Member123!",
    "full_name": "New Member",
    "phone": f"+987654{random.randint(1000, 9999)}"
}

# Register new user
register_new = session.post(
    f"{BASE_URL}/auth/register",
    json=new_user
)

if register_new.status_code != 200:
    print(f"❌ New user registration failed: {register_new.text}")
    # Get user ID from login
    login_new = session.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": new_user["email"],
            "password": new_user["password"]
        }
    )
    if login_new.status_code != 200:
        print("❌ Could not get new user")
        exit(1)
    user_info = login_new.json()
    new_user_id = user_info.get('user_id')
else:
    new_user_id = register_new.json().get('id')

# Add new member to group
if new_user_id:
    add_member_response = session.post(
        f"{BASE_URL}/groups/{group['id']}/members/{new_user_id}",
        params={"is_admin": False}
    )
    
    if add_member_response.status_code != 200:
        print(f"❌ Failed to add member: {add_member_response.text}")
    else:
        print("✅ New member added to group")

# Step 5: Check updated members list
print(f"\n📋 Updated members list:")
members_response = session.get(
    f"{BASE_URL}/groups/{group['id']}/members"
)

if members_response.status_code == 200:
    members = members_response.json()
    print(f"Total members: {len(members)}")
    
    # Updated to match your API response structure
    for i, member in enumerate(members, 1):
        print(f"  {i}. {member.get('user_name', 'Unknown')} - "
              f"Admin: {member.get('is_admin', False)}, "
              f"Order: {member.get('payout_order', 'N/A')}")
        
        # Show email if available
        if member.get('user_email'):
            print(f"     Email: {member['user_email']}")

# Step 6: Test guarantor assignment
if len(members) >= 2:
    print(f"\n🔄 Testing guarantor assignment...")
    
    # First member as guarantor for second member
    first_member_id = members[0].get('membership_id') or members[0].get('id')
    second_member_id = members[1].get('membership_id') or members[1].get('id')
    
    if first_member_id and second_member_id:
        guarantor_response = session.put(
            f"{BASE_URL}/groups/members/{second_member_id}/guarantor",
            params={"guarantor_id": members[0]['user_id']}
        )
        
        if guarantor_response.status_code == 200:
            print("✅ Guarantor assigned successfully")
        else:
            print(f"❌ Guarantor assignment failed: {guarantor_response.text}")

# Step 7: Test member removal
print(f"\n🗑️ Testing member removal...")
if len(members) >= 2:
    # Remove the second member
    remove_response = session.delete(
        f"{BASE_URL}/groups/{group['id']}/members/{members[1]['user_id']}"
    )
    
    if remove_response.status_code == 200:
        print("✅ Member removed successfully")
    else:
        print(f"❌ Member removal failed: {remove_response.text}")

# Final members list
print(f"\n📋 Final members list:")
final_members = session.get(
    f"{BASE_URL}/groups/{group['id']}/members"
).json()
print(f"Total members: {len(final_members)}")
for i, member in enumerate(final_members, 1):
    print(f"  {i}. {member.get('user_name', 'Unknown')} - "
          f"Admin: {member.get('is_admin', False)}")

print("\n✨ Test complete!")