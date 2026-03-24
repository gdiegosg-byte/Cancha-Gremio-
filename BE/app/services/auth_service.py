import bcrypt
import jwt
from fastapi import HTTPException

SECRET = "supersecret"

# ⚠️ luego esto lo conectamos a BD real
fake_user = {
    "id": 1,
    "email": "test@test.com",
    "password": bcrypt.hashpw("1234".encode(), bcrypt.gensalt())
}

def login_user(data):
    if data.email != fake_user["email"]:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    if not bcrypt.checkpw(data.password.encode(), fake_user["password"]):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    token = jwt.encode({"id": fake_user["id"]}, SECRET, algorithm="HS256")

    return {"token": token}


def forgot_password(data):
    token = jwt.encode({"id": fake_user["id"]}, SECRET, algorithm="HS256")
    return {"reset_token": token}


def reset_password(data):
    try:
        jwt.decode(data.token, SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=400, detail="Token inválido")

    new_password = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt())

    return {"message": "Contraseña actualizada"}