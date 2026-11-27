from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate
from app.services.maintenance_service import MaintenanceService

router = APIRouter(prefix="/mantenimiento", tags=["mantenimiento"])


@router.get("/", summary="Listar mantenimientos",
            description="Lista los mantenimientos programados (eventos de tipo MAINTENANCE).")
def get_maintenances(db: Session = Depends(get_db)):
    return MaintenanceService(db).list()


@router.post("/", status_code=201, summary="Crear mantenimiento",
             description="Programa un mantenimiento en una cancha validando que exista y que el horario no se solape.")
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return MaintenanceService(db).create(data, admin)


@router.put("/{maintenance_id}", summary="Actualizar mantenimiento",
            description="Actualiza el horario o descripción de un mantenimiento, revalidando solapamiento.")
def update_maintenance(maintenance_id: int, data: MaintenanceUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return MaintenanceService(db).update(maintenance_id, data, admin)


@router.delete("/{maintenance_id}", status_code=204, summary="Eliminar mantenimiento")
def delete_maintenance(maintenance_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return MaintenanceService(db).delete(maintenance_id, admin)
