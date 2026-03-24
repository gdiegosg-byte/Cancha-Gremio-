from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class EmailRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    token: str
    new_password: str