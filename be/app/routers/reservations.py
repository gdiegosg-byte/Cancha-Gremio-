from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.reservation import (
    ReservationCreate,
    ReservationBulkCreate,
    ReservationUpdate,
    ReservationResponse,
)
from app.services.reservation_service import ReservationService

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"])


@router.get("", response_model=list[ReservationResponse],
            summary="Listar reservas",
            description="Lista de reservas con filtros opcionales: estado, cancha, rango de fechas y búsqueda por cliente.")
def get_reservations(
    estado: str | None = Query(default=None, description="Filtrar por estado: pending, confirmed, cancelled"),
    cancha: int | None = Query(default=None, description="Filtrar por ID de cancha"),
    desde: datetime | None = Query(default=None, description="Solo reservas que inician desde esta fecha/hora"),
    hasta: datetime | None = Query(default=None, description="Solo reservas que inician hasta esta fecha/hora"),
    q: str | None = Query(default=None, description="Búsqueda por nombre, email o teléfono del cliente"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return ReservationService(db).list(estado, cancha, desde, hasta, q)


@router.post("/bulk", response_model=dict,
             summary="Carga masiva de reservas",
             description="Crea varias reservas de una sola vez. Si alguna no cumple las reglas de negocio, no se crea ninguna y se reporta el error con el índice.")
def bulk_create_reservations(payload: ReservationBulkCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    result = ReservationService(db).bulk_create(payload.items, _user)
    result["reservas"] = [ReservationResponse.model_validate(r) for r in result["reservas"]]
    return result


@router.get("/{reservation_id}", response_model=ReservationResponse,
            summary="Obtener una reserva")
def get_reservation(reservation_id: int, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return ReservationService(db).get(reservation_id)


@router.post("", response_model=ReservationResponse, status_code=201,
             summary="Crear reserva",
             description="Crea una reserva verificando que la cancha exista, el horario sea válido y que no se solape con otras reservas o eventos.")
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return ReservationService(db).create(reservation, user)


@router.put("/{reservation_id}", response_model=ReservationResponse,
            summary="Actualizar reserva",
            description="Actualiza datos completos (cliente, cancha, horario), estado o estado de pago de una reserva. Si cambian cancha/horario, se revalida disponibilidad y se recalcula el precio.")
def update_reservation(reservation_id: int, data: ReservationUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return ReservationService(db).update(reservation_id, data, user)


@router.delete("/{reservation_id}",
               summary="Cancelar/eliminar reserva",
               description="Cancela una reserva (borrado lógico: pasa a estado 'cancelled'). El cliente puede cancelar solo sus propias reservas; el administrador puede cancelar cualquiera.")
def delete_reservation(reservation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return ReservationService(db).cancel(reservation_id, user)
