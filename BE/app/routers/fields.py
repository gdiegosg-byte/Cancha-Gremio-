# ¿Qué? Endpoints REST para gestionar campos/canchas
# ¿Para qué? Obtener información de canchas disponibles
# ¿Impacto? Sin este router no se puede ver qué canchas están disponibles

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.field import FieldCreate, FieldResponse
from app.models.field import Field

router = APIRouter(prefix="/api/v1/fields", tags=["fields"])

@router.get("/", response_model=list[FieldResponse])
def get_fields(db: Session = Depends(get_db)):
    # ¿Qué? Obtiene todas las canchas activas
    # ¿Para qué? Mostrar las opciones de canchas disponibles
    fields = db.query(Field).filter(Field.is_active == True).all()
    return fields

@router.get("/{field_id}", response_model=FieldResponse)
def get_field(field_id: int, db: Session = Depends(get_db)):
    # ¿Qué? Obtiene información de una cancha específica
    # ¿Para qué? Ver detalles y características de una cancha
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        return {"error": "Cancha no encontrada"}
    return field

@router.post("/", response_model=FieldResponse, status_code=201)
def create_field(field: FieldCreate, db: Session = Depends(get_db)):
    # ¿Qué? Crea una nueva cancha
    # ¿Para qué? Agregar nuevas canchas al sistema
    new_field = Field(**field.dict())
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field
