from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"},
        get_jwt_secret(), algorithm=JWT_ALGORITHM
    )

def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        get_jwt_secret(), algorithm=JWT_ALGORITHM
    )

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# Auth helpers
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

# Pydantic Models
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = ""
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None

class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(user|admin)$")

VALID_STATUSES = ["todo", "in_progress", "done"]
VALID_PRIORITIES = ["low", "medium", "high"]

# App
app = FastAPI(
    title="TaskFlow API v1",
    description="Scalable REST API with Authentication & Role-Based Access Control",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
v1 = APIRouter(prefix="/api/v1", tags=["v1"])

# ──── AUTH ────

@v1.post("/auth/register")
async def register(body: RegisterReq, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return {"id": uid, "email": email, "name": body.name, "role": "user"}

@v1.post("/auth/login")
async def login(body: LoginReq, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": ident}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        lock = attempt.get("locked_until")
        if lock and datetime.now(timezone.utc).isoformat() < lock:
            raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": ident})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(401, "Invalid email or password")

    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return {"id": uid, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")}

@v1.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@v1.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@v1.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        uid = str(user["_id"])
        response.set_cookie("access_token", create_access_token(uid, user["email"]), httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")

@v1.post("/auth/register-admin")
async def register_admin(body: RegisterReq, request: Request):
    await get_admin_user(request)
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "email": email, "name": body.name, "role": "admin"}

# ──── TASKS ────

@v1.get("/tasks")
async def list_tasks(request: Request, status: Optional[str] = None, priority: Optional[str] = None):
    user = await get_current_user(request)
    q = {} if user["role"] == "admin" else {"user_id": user["_id"]}
    if status and status in VALID_STATUSES:
        q["status"] = status
    if priority and priority in VALID_PRIORITIES:
        q["priority"] = priority
    return await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

@v1.post("/tasks")
async def create_task(body: TaskCreate, request: Request):
    user = await get_current_user(request)
    if body.status not in VALID_STATUSES:
        raise HTTPException(422, f"Status must be one of: {VALID_STATUSES}")
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(422, f"Priority must be one of: {VALID_PRIORITIES}")
    task = {
        "id": str(ObjectId()),
        "title": body.title,
        "description": body.description or "",
        "status": body.status,
        "priority": body.priority,
        "due_date": body.due_date,
        "user_id": user["_id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task

@v1.get("/tasks/{task_id}")
async def get_task(task_id: str, request: Request):
    user = await get_current_user(request)
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(404, "Task not found")
    if user["role"] != "admin" and task.get("user_id") != user["_id"]:
        raise HTTPException(403, "Access denied")
    return task

@v1.put("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, request: Request):
    user = await get_current_user(request)
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found")
    if user["role"] != "admin" and str(task.get("user_id")) != user["_id"]:
        raise HTTPException(403, "Access denied")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(422, "Invalid status")
        updates["status"] = body.status
    if body.priority is not None:
        if body.priority not in VALID_PRIORITIES:
            raise HTTPException(422, "Invalid priority")
        updates["priority"] = body.priority
    if body.due_date is not None:
        updates["due_date"] = body.due_date
    await db.tasks.update_one({"id": task_id}, {"$set": updates})
    return await db.tasks.find_one({"id": task_id}, {"_id": 0})

@v1.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    user = await get_current_user(request)
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found")
    if user["role"] != "admin" and str(task.get("user_id")) != user["_id"]:
        raise HTTPException(403, "Access denied")
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted"}

# ──── ADMIN ────

@v1.get("/admin/users")
async def list_users(request: Request):
    await get_admin_user(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@v1.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    admin = await get_admin_user(request)
    if admin["_id"] == user_id:
        raise HTTPException(400, "Cannot delete yourself")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    await db.tasks.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

@v1.put("/admin/users/{user_id}/role")
async def update_role(user_id: str, body: RoleUpdate, request: Request):
    admin = await get_admin_user(request)
    if admin["_id"] == user_id:
        raise HTTPException(400, "Cannot change your own role")
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": body.role}})
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": f"Role updated to {body.role}"}

# ──── STATS ────

@v1.get("/stats")
async def stats(request: Request):
    user = await get_current_user(request)
    q = {} if user["role"] == "admin" else {"user_id": user["_id"]}
    return {
        "total": await db.tasks.count_documents(q),
        "todo": await db.tasks.count_documents({**q, "status": "todo"}),
        "in_progress": await db.tasks.count_documents({**q, "status": "in_progress"}),
        "done": await db.tasks.count_documents({**q, "status": "done"}),
    }

# Include router
app.include_router(v1)

# Health
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Startup
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index("user_id")
    await db.tasks.create_index("id", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Test User\n")
        f.write("- Email: testuser@example.com\n")
        f.write("- Password: test123456\n")
        f.write("- Role: user\n\n")
        f.write("## Endpoints (prefix: /api/v1)\n")
        f.write("- POST /auth/register, /auth/login, /auth/logout, /auth/refresh, /auth/register-admin\n")
        f.write("- GET /auth/me\n")
        f.write("- GET/POST /tasks, GET/PUT/DELETE /tasks/{id}\n")
        f.write("- GET /admin/users, DELETE /admin/users/{id}, PUT /admin/users/{id}/role\n")
        f.write("- GET /stats\n")
        f.write("- GET /api/health\n")
        f.write("- Swagger: /api/docs\n")

@app.on_event("shutdown")
async def shutdown():
    client.close()
