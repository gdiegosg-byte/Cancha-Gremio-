from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate
from app.services.event_service import EventService

router = APIRouter(prefix="/eventos", tags=["eventos"])


@router.get("/", summary="Listar eventos",
            description="Lista los eventos (torneos, ligas y especiales) excluyendo mantenimientos, mapeados para el frontend.")
def get_events(db: Session = Depends(get_db)):
    return EventService(db).list()


@router.post("/", status_code=201, summary="Crear evento",
             description="Crea un evento o bloqueo de horario verificando que la cancha exista, el horario sea válido y no se solape con otro evento/reserva.")
def create_event(data: EventCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return EventService(db).create(data, admin)


@router.put("/{event_id}", summary="Actualizar evento",
            description="Actualiza uno o varios campos de un evento con validación de tipos y de solapamiento.")
def update_event(event_id: int, data: EventUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return EventService(db).update(event_id, data, admin)


@router.delete("/{event_id}", summary="Eliminar evento",
               description="Elimina un evento de forma permanente.")
def delete_event(event_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return EventService(db).delete(event_id, admin)
