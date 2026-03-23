# C:\proof\rosca\backend\app\main.py

from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import all routers
from app.routers import auth, groups, contributions, members, users, admin  # admin is already here!

app = FastAPI(
    title="ROSCA Platform API",
    description="Rotating Savings and Credit Association Management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React dev server
        "http://localhost:3000",   # Alternative React port
        "http://127.0.0.1:5173",   # Local IP
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - note that admin is already included!
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(members.router)
app.include_router(contributions.router)
app.include_router(admin.router)  # Admin router is already included

@app.get("/")
def root():
    return {
        "message": "Welcome to ROSCA Platform API", 
        "status": "operational",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth",
            "users": "/users", 
            "groups": "/groups",
            "members": "/members",
            "contributions": "/contributions",
            "admin": "/admin"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }