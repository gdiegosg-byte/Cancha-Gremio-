from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MaintenanceCreate(BaseModel):
    cancha: int  # Representa field_id
    fecha: str   # Formato: YYYY-MM-DD
    horaInicio: str  # Formato: HH:MM
    horaFin: str     # Formato: HH:MM
    descripcion: str
    proveedor: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: int
    cancha: int
    fecha: str
    horaInicio: str
    horaFin: str
    descripcion: str
    proveedor: Optional[str] = None

    class Config:
        from_attributes = True
