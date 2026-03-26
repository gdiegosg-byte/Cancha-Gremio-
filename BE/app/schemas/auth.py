from pydantic import BaseModel

class LoginRequest(BaseModel):
    correo: str
    contraseña: str

class RegisterRequest(BaseModel):
    nombre: str
    apellido: str | None = ""
    correo: str
    contraseña: str
    telefono: str | None = ""
    direccion: str | None = ""
    fecha_nacimiento: str | None = ""
    id_tipo_documento: int | None = None

class EmailRequest(BaseModel):
    correo: str

class ResetRequest(BaseModel):
    contraseña: str