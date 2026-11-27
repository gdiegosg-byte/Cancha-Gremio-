from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.clientes import ClienteUpdate
from app.services.client_service import ClientService

router = APIRouter(prefix="/api/admin/clientes", tags=["clientes"], dependencies=[Depends(require_admin)])


@router.get("/", summary="Listar clientes",
            description="Lista de clientes con su número de reservas (agregado por subconsulta).")
def get_clients(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return ClientService(db).list()


@router.put("/{user_id}/estado", summary="Cambiar estado de un cliente")
def toggle_client_status(user_id: int, payload: dict = Body(...), db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return ClientService(db).toggle_status(user_id, payload, admin)


@router.put("/{user_id}/impuntualidad", summary="Registrar falta de impuntualidad",
            description="Incrementa el contador de impuntualidades consecutivas del cliente. Al llegar a 3, el usuario queda inhabilitado automáticamente.")
def add_punctuality_strike(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return ClientService(db).add_strike(user_id, admin)


@router.put("/{user_id}/impuntualidad/reset", summary="Reiniciar contador de impuntualidades",
            description="Devuelve a cero el contador de impuntualidades consecutivas del cliente.")
def reset_punctuality_strikes(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return ClientService(db).reset_strikes(user_id, admin)


@router.put("/{user_id}", summary="Actualizar datos de un cliente",
            description="Actualiza nombre, correo y/o teléfono, validando que el correo no esté duplicado.")
def update_client(user_id: int, data: ClienteUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return ClientService(db).update(user_id, data, admin)
