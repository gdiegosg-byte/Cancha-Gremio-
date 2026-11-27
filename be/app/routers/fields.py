from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.schemas.field import FieldCreate, FieldUpdate, FieldResponse
from app.models.user import User
from app.services.field_service import FieldService

router = APIRouter(prefix="/api/v1/fields", tags=["fields"])


@router.get("/", response_model=list[FieldResponse],
            summary="Listar canchas activas")
def get_fields(db: Session = Depends(get_db)):
    return FieldService(db).list_active()


@router.get("/all", response_model=list[FieldResponse],
            summary="Listar todas las canchas (incluye inactivas)")
def get_all_fields(db: Session = Depends(get_db)):
    return FieldService(db).list_all()


@router.get("/{field_id}", response_model=FieldResponse,
            summary="Obtener una cancha")
def get_field(field_id: int, db: Session = Depends(get_db)):
    return FieldService(db).get(field_id)


@router.post("/", response_model=FieldResponse, status_code=201,
             summary="Crear cancha",
             description="Crea una cancha verificando que el nombre no esté duplicado y que el precio/tarifa sean positivos.")
def create_field(field: FieldCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return FieldService(db).create(field, admin)


@router.put("/{field_id}", response_model=FieldResponse,
            summary="Actualizar cancha")
def update_field(field_id: int, data: FieldUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return FieldService(db).update(field_id, data, admin)


@router.delete("/{field_id}", summary="Desactivar cancha",
               description="Desactiva una cancha de forma lógica (is_active = false). No se elimina físicamente por si tiene reservas.")
def delete_field(field_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return FieldService(db).deactivate(field_id, admin)
