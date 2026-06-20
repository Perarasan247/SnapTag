import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from jose import jwt, JWTError
from dotenv import load_dotenv
from database import get_conn

load_dotenv()

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
JWT_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", 30))


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def make_token(user_id: int, email: str) -> str:
    return jwt.encode(
        {"userId": user_id, "email": email,
         "exp": datetime.utcnow() + timedelta(days=JWT_DAYS)},
        JWT_SECRET, algorithm="HS256"
    )


class RegisterBody(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterBody):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password required")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    hashed = hash_pw(body.password)
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "INSERT INTO users (email, password, name) VALUES (%s, %s, %s)",
            (body.email.strip().lower(), hashed, body.name)
        )
        conn.commit()
        uid = cur.lastrowid
        token = make_token(uid, body.email.strip().lower())
        return {"token": token, "user": {"id": uid, "email": body.email.strip().lower(), "name": body.name}}
    except Exception as e:
        if "Duplicate entry" in str(e):
            raise HTTPException(409, "An account with this email already exists")
        raise HTTPException(500, f"Server error: {e}")
    finally:
        cur.close()
        conn.close()


@router.post("/login")
def login(body: LoginBody):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, email, password, name, role FROM users WHERE email = %s",
            (body.email.strip().lower(),)
        )
        user = cur.fetchone()
        if not user or not verify_pw(body.password, user["password"]):
            raise HTTPException(401, "Invalid email or password")
        token = make_token(user["id"], user["email"])
        return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}
    finally:
        cur.close()
        conn.close()


@router.post("/verify")
def verify(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"valid": True, "userId": payload["userId"], "email": payload["email"]}
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
