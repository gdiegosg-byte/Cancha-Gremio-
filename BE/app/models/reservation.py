# ¿Qué? Modelo ORM que representa una reserva en la base de datos
# ¿Para qué? Mapear la tabla "reservations" a un objeto Python
# ¿Impacto? Sin este modelo no se pueden guardar reservas

from sqlalchemy import Column, Integer, String, DateTime, Float
from app.database import Base
import datetime

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    client_phone = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
