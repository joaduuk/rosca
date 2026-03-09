import requests
import json

BASE_URL = "http://localhost:8000"

# Login as admin user
login_data = {
    "username": "joaduuk@yahoo.co.uk",
    "password": "Agyakojo47"
}
response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("✅ Logged in successfully")

# 1. First, create a test user to add as member
# (You can also use an existing user ID from your database)

# 2. List your groups to get a group ID
response = requests.get(f"{BASE_URL}/groups/", headers=headers)
groups = response.json()
if groups:
    group_id = groups[0]["id"]
    print(f"Using group: {groups[0]['name']} (ID: {group_id})")
    
    # 3. Add a member to the group
    # You'll need another user's ID - check in pgAdmin or create one
    # user_id = "some-user-id-from-database"
    # response = requests.post(
    #     f"{BASE_URL}/groups/{group_id}/members/{user_id}",
    #     headers=headers
    # )
    # print("Added member:", response.json())
    
    # 4. List all members
    response = requests.get(f"{BASE_URL}/groups/{group_id}/members", headers=headers)
    print("\n📋 Group Members:")
    for member in response.json():
        print(f"  • {member.get('user_name', 'Unknown')} - Admin: {member['is_admin']}")
else:
    print("No groups found. Create one first!")