# ¿Qué? Schemas Pydantic para validar datos de campos/canchas
# ¿Para qué? Garantizar que los datos de canchas tienen el formato correcto
# ¿Impacto? Sin validación, datos incorrectos podrían dañar la BD

from pydantic import BaseModel
from datetime import datetime

class FieldCreate(BaseModel):
    name: str
    description: str = ""
    price_per_hour: float
    surface_type: str = "SYNTHETIC"
    capacity: int = 10
    length_meters: float = 40
    width_meters: float = 20
    available_hour_start: str = "06:00"
    available_hour_end: str = "22:00"

class FieldResponse(BaseModel):
    id: int
    name: str
    description: str
    price_per_hour: float
    surface_type: str
    capacity: int
    length_meters: float
    width_meters: float
    available_hour_start: str
    available_hour_end: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
