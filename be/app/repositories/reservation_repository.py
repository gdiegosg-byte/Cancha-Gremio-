from app.models.reservation import Reservation
from app.repositories.base import BaseRepository


class ReservationRepository(BaseRepository):
    def list(self, estado=None, cancha=None, desde=None, hasta=None, q=None):
        query = self.db.query(Reservation)
        if estado:
            query = query.filter(Reservation.status == estado)
        if cancha:
            query = query.filter(Reservation.field_id == cancha)
        if desde:
            query = query.filter(Reservation.start_time >= desde)
        if hasta:
            query = query.filter(Reservation.start_time <= hasta)
        if q:
            like = f"%{q.strip()}%"
            query = query.filter(
                (Reservation.client_name.ilike(like))
                | (Reservation.client_email.ilike(like))
                | (Reservation.client_phone.ilike(like))
            )
        return query.all()

    def get(self, reservation_id: int):
        return self.db.query(Reservation).filter(Reservation.id == reservation_id).first()

    def has_overlap(self, field_id: int, start, end, exclude_id=None):
        query = self.db.query(Reservation).filter(
            Reservation.field_id == field_id,
            Reservation.status.in_(["pending", "confirmed"]),
            Reservation.start_time < end,
            Reservation.end_time > start,
        )
        if exclude_id is not None:
            query = query.filter(Reservation.id != exclude_id)
        return query.first()

    def get_by_user(self, user_id: int):
        return (
            self.db.query(Reservation)
            .filter(Reservation.user_id == user_id)
            .order_by(Reservation.start_time.asc())
            .all()
        )

    def create(self, data: dict):
        reservation = Reservation(**data)
        self.db.add(reservation)
        self.db.commit()
        self.db.refresh(reservation)
        return reservation

    def save(self, reservation):
        self.db.commit()
        self.db.refresh(reservation)
        return reservation
