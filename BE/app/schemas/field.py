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
    description: str | None = ""
    price_per_hour: float
    surface_type: str
    capacity: int
    length_meters: float | None = 40.0
    width_meters: float | None = 20.0
    available_hour_start: str | None = "06:00"
    available_hour_end: str | None = "22:00"
    is_active: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True
