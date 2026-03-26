import bcrypt
import jwt
from fastapi import HTTPException

SECRET = "supersecret"

# Usuarios temporales en memoria (afecta solo la sesión actual del servidor)
users = []

# Usuario administrador por defecto
admin_user = {
    "id": 1,
    "nombre": "Admin",
    "apellido": "",
    "email": "admin@canchagremio.com",
    "telefono": "",
    "password": bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()),
    "id_rol": 1,
    "nombre_rol": "admin",
}
users.append(admin_user)


def _find_user_by_email(email: str):
    return next((u for u in users if u["email"].lower() == email.lower()), None)


def _find_user_by_id(user_id: int):
    return next((u for u in users if u["id"] == user_id), None)


def login_user(data):
    email = data.correo
    password = data.contraseña

    user = _find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    if not bcrypt.checkpw(password.encode(), user["password"]):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    token = jwt.encode({"id": user["id"]}, SECRET, algorithm="HS256")
    return {
        "token": token,
        "usuario": {
            "id_usuario": user["id"],
            "nombre": user.get("nombre", ""),
            "apellido": user.get("apellido", ""),
            "correo": user["email"],
            "telefono": user.get("telefono", ""),
            "id_rol": user.get("id_rol", 2),
            "nombre_rol": user.get("nombre_rol", "cliente"),
        },
    }


def register_user(data):
    if _find_user_by_email(data.correo):
        raise HTTPException(status_code=400, detail="El correo ya está en uso")

    new_id = max((u["id"] for u in users), default=0) + 1
    hashed = bcrypt.hashpw(data.contraseña.encode(), bcrypt.gensalt())

    user = {
        "id": new_id,
        "nombre": data.nombre,
        "apellido": getattr(data, "apellido", ""),
        "email": data.correo,
        "telefono": getattr(data, "telefono", ""),
        "direccion": getattr(data, "direccion", ""),
        "fecha_nacimiento": getattr(data, "fecha_nacimiento", ""),
        "id_tipo_documento": getattr(data, "id_tipo_documento", None),
        "password": hashed,
        "id_rol": 2,
        "nombre_rol": "cliente",
    }
    users.append(user)

    token = jwt.encode({"id": user["id"]}, SECRET, algorithm="HS256")
    return {
        "token": token,
        "usuario": {
            "id_usuario": user["id"],
            "nombre": user["nombre"],
            "apellido": user.get("apellido", ""),
            "correo": user["email"],
            "telefono": user.get("telefono", ""),
            "id_rol": user["id_rol"],
            "nombre_rol": user["nombre_rol"],
        },
    }


def get_profile(token):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = _find_user_by_id(payload.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "id_usuario": user["id"],
        "nombre": user.get("nombre", ""),
        "apellido": user.get("apellido", ""),
        "correo": user["email"],
        "telefono": user.get("telefono", ""),
        "id_rol": user.get("id_rol", 2),
        "nombre_rol": user.get("nombre_rol", "cliente"),
    }


def forgot_password(data):
    user = _find_user_by_email(data.correo)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    token = jwt.encode({"id": user["id"]}, SECRET, algorithm="HS256")
    return {"reset_token": token}


def reset_password(token, data):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token inválido")

    user = _find_user_by_id(payload.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    user["password"] = bcrypt.hashpw(data.contraseña.encode(), bcrypt.gensalt())
    return {"message": "Contraseña actualizada"}