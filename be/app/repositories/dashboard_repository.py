from sqlalchemy import func

from app.models.event import Event
from app.models.field import Field
from app.models.reservation import Reservation
from app.models.user import User
from app.repositories.base import BaseRepository


class DashboardRepository(BaseRepository):
    def count_reservations(self, start, end):
        return self.db.query(func.count(Reservation.id)).filter(
            Reservation.start_time >= start,
            Reservation.start_time <= end,
        ).scalar() or 0

    def sum_income(self, start, end=None, status="confirmed"):
        query = self.db.query(func.coalesce(func.sum(Reservation.total_price), 0)).filter(
            Reservation.start_time >= start,
            Reservation.status == status,
        )
        if end is not None:
            query = query.filter(Reservation.start_time <= end)
        return query.scalar()

    def count_pending(self):
        return self.db.query(func.count(Reservation.id)).filter(
            Reservation.status == "pending"
        ).scalar() or 0

    def count_clients(self):
        return self.db.query(func.count(User.id)).filter(User.role == "CLIENT").scalar() or 0

    def count_upcoming_events(self, now):
        return self.db.query(func.count(Event.id)).filter(
            Event.start_time >= now,
            Event.event_type != "MAINTENANCE",
        ).scalar() or 0

    def booked_hours(self, start, end):
        return self.db.query(
            func.coalesce(func.sum(func.extract("epoch", Reservation.end_time - Reservation.start_time) / 3600), 0)
        ).filter(
            Reservation.start_time >= start,
            Reservation.start_time <= end,
            Reservation.status == "confirmed",
        ).scalar()

    def active_fields(self):
        return self.db.query(Field).filter(Field.is_active.is_(True)).all()

    def report_reservations(self, start, end, field_id=None, estado=None):
        query = self.db.query(Reservation).filter(
            Reservation.start_time >= start,
            Reservation.start_time < end,
        )
        if field_id:
            query = query.filter(Reservation.field_id == field_id)
        if estado:
            query = query.filter(Reservation.status == estado)
        return query.order_by(Reservation.start_time.asc()).all()
