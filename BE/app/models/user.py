# ¿Qué? Modelo ORM para usuarios del sistema
# ¿Para qué? Almacenar datos de clientes y administradores
# ¿Impacto? Permite autenticación y gestión de permisos

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)  # Hash seguro
    role = Column(String, default="CLIENT")  # CLIENT o ADMIN
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
