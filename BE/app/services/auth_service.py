import bcrypt
from jose import jwt
from fastapi import HTTPException
from app.database import SessionLocal
from app.models.user import User
import os

SECRET = os.getenv("SECRET_KEY", "supersecret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


def login_user(data):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email.ilike(data.correo)).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no existe")

        password_hash = user.password.encode('utf-8') if isinstance(user.password, str) else user.password
        if not bcrypt.checkpw(data.password.encode('utf-8'), password_hash):
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")

        token = jwt.encode({"id": user.id, "email": user.email}, SECRET, algorithm=ALGORITHM)

        return {
            "token": token,
            "usuario": {
                "id_usuario": user.id,
                "nombre": user.name,
                "apellido": "",
                "correo": user.email,
                "telefono": user.phone or "",
                "id_rol": 1 if user.role == "ADMIN" else 2,
                "nombre_rol": "admin" if user.role == "ADMIN" else "cliente",
            },
        }
    finally:
        db.close()


def register_user(data):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email.ilike(data.correo)).first()
        if existing:
            raise HTTPException(status_code=400, detail="El correo ya está en uso")

        # CORREGIDO: era data.contraseña, debe ser data.password
        hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

        new_user = User(
            name=data.nombre,
            email=data.correo,
            phone=data.telefono or "",
            password=hashed,
            role="CLIENT",
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = jwt.encode({"id": new_user.id, "email": new_user.email}, SECRET, algorithm=ALGORITHM)

        return {
            "token": token,
            "usuario": {
                "id_usuario": new_user.id,
                "nombre": new_user.name,
                "apellido": "",
                "correo": new_user.email,
                "telefono": new_user.phone or "",
                "id_rol": 1 if new_user.role == "ADMIN" else 2,
                "nombre_rol": "admin" if new_user.role == "ADMIN" else "cliente",
            },
        }
    finally:
        db.close()


def get_profile(token):
    db = SessionLocal()
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        return {
            "id_usuario": user.id,
            "nombre": user.name,
            "apellido": "",
            "correo": user.email,
            "telefono": user.phone or "",
            "id_rol": 1 if user.role == "ADMIN" else 2,
            "nombre_rol": "admin" if user.role == "ADMIN" else "cliente",
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    finally:
        db.close()


def forgot_password(data):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email.ilike(data.correo)).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no existe")

        token = jwt.encode({"id": user.id}, SECRET, algorithm=ALGORITHM)
        return {"reset_token": token}
    finally:
        db.close()


def reset_password(token, data):
    db = SessionLocal()
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == payload.get("id")).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no existe")

        # CORREGIDO: era data.contraseña, debe ser data.password
        user.password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
        db.commit()
        return {"message": "Contraseña actualizada"}
    except Exception:
        raise HTTPException(status_code=400, detail="Token inválido")
    finally:
        db.close()