from fastapi import APIRouter, Header, HTTPException
from app.schemas.auth import LoginRequest, EmailRequest, ResetRequest, RegisterRequest
from app.services.auth_service import login_user, register_user, get_profile, forgot_password, reset_password

router = APIRouter()

@router.post("/login")
def login(data: LoginRequest):
    return login_user(data)

@router.post("/registro")
def register(data: RegisterRequest):
    return register_user(data)

@router.get("/perfil")
def perfil(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    return get_profile(token)

@router.post("/forgot-password")
def forgot(data: EmailRequest):
    return forgot_password(data)

@router.post("/reset-password/{token}")
def reset(token: str, data: ResetRequest):
    return reset_password(token, data)
