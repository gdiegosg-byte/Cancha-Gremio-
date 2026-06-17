# ¿Qué? Endpoints REST para gestionar reservas
# ¿Para qué? Exponer operaciones CRUD al frontend
# ¿Impacto? Sin este router el frontend no puede crear ni consultar reservas

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.reservation import ReservationCreate, ReservationResponse
from app.models.reservation import Reservation

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"])

@router.get("/", response_model=list[ReservationResponse])
def get_reservations(db: Session = Depends(get_db)):
    # ¿Qué? Obtiene todas las reservas
    # ¿Para qué? Mostrar el calendario de reservas
    reservations = db.query(Reservation).all()
    return reservations

@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    # ¿Qué? Obtiene una reserva específica
    # ¿Para qué? Ver detalles de una reserva
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        return {"error": "Reserva no encontrada"}
    return reservation

@router.post("/", response_model=ReservationResponse, status_code=201)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    # ¿Qué? Crea una nueva reserva
    # ¿Para qué? Registrar la solicitud de un cliente
    new_reservation = Reservation(
        client_name=reservation.client_name,
        client_email=reservation.client_email,
        client_phone=reservation.client_phone,
        start_time=reservation.start_time,
        end_time=reservation.end_time,
        total_price=0,  # Calcular basado en la cancha
        field_id=1  # Por defecto
    )
    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)
    return new_reservation
