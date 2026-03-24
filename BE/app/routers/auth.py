from fastapi import APIRouter, HTTPException
from app.schemas.auth import LoginRequest, EmailRequest, ResetRequest
from app.services.auth_service import login_user, forgot_password, reset_password

router = APIRouter()

@router.post("/login")
def login(data: LoginRequest):
    return login_user(data)

@router.post("/forgot-password")
def forgot(data: EmailRequest):
    return forgot_password(data)

@router.post("/reset-password")
def reset(data: ResetRequest):
    return reset_password(data)
