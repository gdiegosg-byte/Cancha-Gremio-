# ¿Qué? Schemas Pydantic para validar datos de reservas
# ¿Para qué? Garantizar que los datos recibidos tienen el formato correcto
# ¿Impacto? Sin validación, datos incorrectos podrían dañar la BD

from pydantic import BaseModel, EmailStr
from datetime import datetime

class ReservationCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    start_time: datetime
    end_time: datetime

class ReservationResponse(BaseModel):
    id: int
    client_name: str
    client_email: str
    start_time: datetime
    end_time: datetime
    total_price: float
    status: str

    class Config:
        from_attributes = True
