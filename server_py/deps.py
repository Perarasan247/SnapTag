import os
from fastapi import Header, HTTPException
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")

def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid token format")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"userId": payload["userId"], "email": payload["email"]}
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
