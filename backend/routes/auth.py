from fastapi import APIRouter, Depends, HTTPException, status
from config.db import get_db
from middleware.auth import verify_password, create_access_token, hash_password
from models.user import UserLoginRequest, UserCreateRequest

router = APIRouter(tags=["Authentication"])

@router.post("/login")
@router.post("/auth/login")
async def login(body: UserLoginRequest, db=Depends(get_db)):
    email_lower = body.email.lower().strip()
    user_doc = await db.users.find_one({"email": email_lower})
    if not user_doc or not verify_password(body.password, user_doc.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    user_id = str(user_doc["_id"])
    token_data = {
        "sub": user_id,
        "email": user_doc["email"],
        "role": user_doc["role"],
    }
    access_token = create_access_token(token_data)
    
    user_res = {
        "id": user_id,
        "name": user_doc["name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "department": user_doc.get("department"),
        "phone": user_doc.get("phone"),
    }
    
    return {
        "access_token": access_token,
        "token": access_token,
        "token_type": "bearer",
        "user": user_res
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserCreateRequest, db=Depends(get_db)):
    email_clean = body.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered",
        )
    
    password_hash = hash_password(body.password)
    user_doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "password_hash": password_hash,
        "role": "WORKER",
        "department": body.department,
        "phone": body.phone,
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    token_data = {
        "sub": user_id,
        "email": user_doc["email"],
        "role": user_doc["role"],
    }
    access_token = create_access_token(token_data)
    
    user_res = {
        "id": user_id,
        "name": user_doc["name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "department": user_doc.get("department"),
        "phone": user_doc.get("phone"),
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_res
    }

