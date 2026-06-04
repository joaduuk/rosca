# backend/app/main.py
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import auth, groups, contributions, members, users, admin, notifications
from app.tasks.due_reminders import start_scheduler

app = FastAPI(
    title="ROSCA Platform API",
    description="Rotating Savings and Credit Association Management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://roscaapp.com",
        "https://www.roscaapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(members.router)
app.include_router(contributions.router)
app.include_router(admin.router)
app.include_router(notifications.router)


@app.on_event("startup")
def on_startup():
    start_scheduler()
    print("[APP] ROSCA API started — scheduler running")


@app.get("/")
def root():
    return {"message": "Welcome to ROSCA Platform API", "status": "operational", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
