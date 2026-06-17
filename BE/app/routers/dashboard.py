from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.reservation import Reservation
from app.models.user import User
from app.models.event import Event
from datetime import datetime, date

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    today = date.today()
    start_of_today = datetime.combine(today, datetime.min.time())
    end_of_today = datetime.combine(today, datetime.max.time())
    
    # Start of month
    start_of_month = datetime(today.year, today.month, 1)

    # 1. totalReservasHoy
    total_hoy = db.query(Reservation).filter(
        Reservation.start_time >= start_of_today,
        Reservation.start_time <= end_of_today
    ).count()

    # 2. ingresosDia
    ingresos_dia_res = db.query(Reservation).filter(
        Reservation.start_time >= start_of_today,
        Reservation.start_time <= end_of_today,
        Reservation.status == "confirmed"
    ).all()
    ingresos_dia = sum(r.total_price for r in ingresos_dia_res)

    # 3. ingresosMes
    ingresos_mes_res = db.query(Reservation).filter(
        Reservation.start_time >= start_of_month,
        Reservation.status == "confirmed"
    ).all()
    ingresos_mes = sum(r.total_price for r in ingresos_mes_res)

    # 4. reservasPendientes
    pendientes = db.query(Reservation).filter(
        Reservation.status == "pending"
    ).count()

    # 5. clientesRegistrados
    clientes = db.query(User).filter(
        User.role == "CLIENT"
    ).count()

    # 6. proximosEventos
    eventos = db.query(Event).filter(
        Event.start_time >= datetime.now(),
        Event.event_type != "MAINTENANCE"
    ).count()

    return {
        "totalReservasHoy": total_hoy,
        "ingresosDia": ingresos_dia,
        "ingresosMes": ingresos_mes,
        "reservasPendientes": pendientes,
        "ocupacionPromedio": 65, # Valor estático de ejemplo
        "clientesRegistrados": clientes,
        "proximosEventos": eventos
    }
