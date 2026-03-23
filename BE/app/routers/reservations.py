# ¿Qué? Endpoints REST para gestionar reservas
# ¿Para qué? Exponer operaciones CRUD al frontend
# ¿Impacto? Sin este router el frontend no puede crear ni consultar reservas

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.reservation import ReservationCreate, ReservationResponse

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"])

@router.get("/", response_model=list[ReservationResponse])
def get_reservations(db: Session = Depends(get_db)):
    # ¿Qué? Obtiene todas las reservas
    # ¿Para qué? Mostrar el calendario de reservas
    return []

@router.post("/", response_model=ReservationResponse, status_code=201)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    # ¿Qué? Crea una nueva reserva
    # ¿Para qué? Registrar la solicitud de un cliente
    pass
