# C:\proof\rosca\backend\app\main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import auth, groups
from app.routers import auth, groups, contributions, members  # Add contributions

app = FastAPI(
    title="ROSCA Platform API",
    description="Rotating Savings and Credit Association Management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(contributions.router)  # Add this line
app.include_router(members.router)  # Add this line

@app.get("/")
def root():
    return {"message": "Welcome to ROSCA Platform API", "status": "operational"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}