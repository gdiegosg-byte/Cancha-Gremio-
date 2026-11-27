from datetime import datetime

from app.models.field import Field
from app.models.reservation import Reservation
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.event_repository import EventRepository
from app.repositories.field_repository import FieldRepository
from app.repositories.reservation_repository import ReservationRepository
from app.services.exceptions import ConflictError, DomainError, ForbiddenError, NotFoundError, ValidationError
from app.services.pricing_service import PricingService


class ReservationService:
    def __init__(self, db):
        self.db = db
        self.reservations = ReservationRepository(db)
        self.fields = FieldRepository(db)
        self.events = EventRepository(db)
        self.audit = AuditRepository(db)
        self.pricing = PricingService(db)

    @staticmethod
    def _to_minutes(hhmm: str) -> int:
        h, m = hhmm.split(":")
        return int(h) * 60 + int(m)

    def _check_field_availability(self, field_id: int) -> Field:
        field = self.fields.get(field_id)
        if not field:
            raise NotFoundError("Cancha no encontrada")
        return field

    def _validate_window(self, field: Field, start_time: datetime, end_time: datetime):
        if end_time <= start_time:
            raise ValidationError("La fecha de inicio debe ser anterior a la de fin")
        try:
            a = self._to_minutes(field.available_hour_start)
            b = self._to_minutes(field.available_hour_end)
        except (ValueError, AttributeError):
            return
        h_inicio = start_time.hour * 60 + start_time.minute
        h_fin = end_time.hour * 60 + end_time.minute
        if a >= b:
            dentro = (h_inicio >= a or h_inicio <= b) and (h_fin <= b or h_fin >= a)
        else:
            dentro = h_inicio >= a and h_fin <= b
        if not dentro:
            raise ValidationError(
                f"La reserva debe estar dentro del horario operativo de la cancha "
                f"({field.available_hour_start} - {field.available_hour_end})"
            )

    def check_conflicts(self, field_id: int, start_time, end_time, exclude_id: int = None):
        overlap = self.reservations.has_overlap(field_id, start_time, end_time, exclude_id=exclude_id)
        if overlap:
            raise ConflictError(f"La cancha ya está reservada en ese horario (reserva #{overlap.id})")
        blocked = self.events.has_overlap(field_id, start_time, end_time)
        if blocked:
            raise ConflictError(f"Horario bloqueado por: {blocked.name}")

    def _build_reservation(self, item):
        field = self._check_field_availability(item.field_id)
        self._validate_window(field, item.start_time, item.end_time)
        self.check_conflicts(item.field_id, item.start_time, item.end_time)
        hours = max((item.end_time - item.start_time).total_seconds() / 3600, 1)
        price_per_hour, _tier = self.pricing.get_hour_price(field, item.start_time)
        return {
            "field_id": item.field_id,
            "client_name": item.client_name.strip(),
            "client_email": item.client_email.strip(),
            "client_phone": item.client_phone.strip(),
            "start_time": item.start_time,
            "end_time": item.end_time,
            "total_price": round(price_per_hour * hours, 2),
            "status": item.status or "pending",
            "payment_status": item.payment_status or "pending",
        }

    def list(self, estado=None, cancha=None, desde=None, hasta=None, q=None):
        if estado and estado not in {"pending", "confirmed", "cancelled"}:
            raise ValidationError(f"Estado inválido: {estado}")
        reservas = self.reservations.list(estado=estado, cancha=cancha, desde=desde, hasta=hasta, q=q)
        return sorted(reservas, key=lambda r: r.start_time, reverse=True)

    def create(self, item, user: User):
        reservation = self.reservations.create(self._build_reservation(item))
        self.audit.write(
            "reservations",
            reservation.id,
            "CREATE",
            f"Reserva #{reservation.id} creada para cancha {reservation.field_id}: {reservation.start_time} - {reservation.end_time}",
            performed_by=user.email,
        )
        return reservation

    def bulk_create(self, items, user: User):
        if not items:
            raise ValidationError("La lista de reservas está vacía")
        if len(items) > 500:
            raise ValidationError("Máximo 500 reservas por carga")
        created = []
        for index, item in enumerate(items, start=1):
            try:
                data = self._build_reservation(item)
                reservation = self.reservations.add(Reservation(**data))
                self.db.flush()
            except DomainError as exc:
                self.reservations.rollback()
                error = DomainError(f"Error en la reserva #{index}: {exc.detail}")
                error.status_code = exc.status_code
                raise error from exc
            created.append(reservation)
        self.db.commit()
        for reservation in created:
            self.db.refresh(reservation)
        self.audit.write(
            "reservations",
            None,
            "BULK_CREATE",
            f"Se crearon {len(created)} reservas masivamente",
            performed_by=user.email,
        )
        return {"creadas": len(created), "reservas": created}

    def get(self, reservation_id: int):
        reservation = self.reservations.get(reservation_id)
        if not reservation:
            raise NotFoundError("Reserva no encontrada")
        return reservation

    def update(self, reservation_id: int, data, user: User):
        reservation = self.get(reservation_id)
        is_owner = reservation.client_email.lower() == (user.email or "").lower()
        is_admin = user.role == "ADMIN"
        if not is_admin and not is_owner:
            raise ForbiddenError("No tienes permiso para modificar esta reserva")
        only_payment = (
            data.field_id is None
            and data.start_time is None
            and data.end_time is None
            and data.client_name is None
            and data.client_email is None
            and data.client_phone is None
            and data.status is None
        )
        if not is_admin and not only_payment:
            raise ForbiddenError("Solo el administrador puede modificar estos datos")

        changes = []
        new_field_id = data.field_id if data.field_id is not None else reservation.field_id
        new_start = data.start_time if data.start_time is not None else reservation.start_time
        new_end = data.end_time if data.end_time is not None else reservation.end_time

        if (data.field_id is not None and data.field_id != reservation.field_id) or \
           (data.start_time is not None and data.start_time != reservation.start_time) or \
           (data.end_time is not None and data.end_time != reservation.end_time):
            field = self._check_field_availability(new_field_id)
            self._validate_window(field, new_start, new_end)
            self.check_conflicts(new_field_id, new_start, new_end, exclude_id=reservation.id)
            hours = max((new_end - new_start).total_seconds() / 3600, 1)
            price_per_hour, _tier = self.pricing.get_hour_price(field, new_start)
            new_price = round(price_per_hour * hours, 2)
            if new_price != reservation.total_price:
                changes.append(f"total_price: {reservation.total_price} -> {new_price}")
                reservation.total_price = new_price
            reservation.field_id = new_field_id
            reservation.start_time = new_start
            reservation.end_time = new_end

        if data.client_name is not None:
            if data.client_name.strip() != reservation.client_name:
                changes.append(f"client_name: {reservation.client_name} -> {data.client_name.strip()}")
            reservation.client_name = data.client_name.strip()
        if data.client_email is not None:
            if data.client_email.strip() != reservation.client_email:
                changes.append(f"client_email: {reservation.client_email} -> {data.client_email.strip()}")
            reservation.client_email = data.client_email.strip()
        if data.client_phone is not None:
            if data.client_phone.strip() != reservation.client_phone:
                changes.append(f"client_phone: {reservation.client_phone} -> {data.client_phone.strip()}")
            reservation.client_phone = data.client_phone.strip()

        if data.status is not None:
            if data.status not in {"pending", "confirmed", "cancelled"}:
                raise ValidationError(f"Estado inválido: {data.status}")
            if data.status != reservation.status:
                changes.append(f"status: {reservation.status} -> {data.status}")
            reservation.status = data.status

        if data.payment_status is not None:
            if data.payment_status not in {"pending", "partial", "paid", "cancelled", "refunded"}:
                raise ValidationError(f"Estado de pago inválido: {data.payment_status}")
            if data.payment_status != reservation.payment_status:
                changes.append(f"payment_status: {reservation.payment_status} -> {data.payment_status}")
            reservation.payment_status = data.payment_status

        self.db.commit()
        self.db.refresh(reservation)
        if changes:
            self.audit.write("reservations", reservation.id, "UPDATE", "; ".join(changes), performed_by=user.email)
        return reservation

    def cancel(self, reservation_id: int, user: User):
        reservation = self.get(reservation_id)
        if user.role != "ADMIN" and reservation.client_email.lower() != user.email.lower():
            raise ForbiddenError("Solo puedes cancelar tus propias reservas")
        reservation.status = "cancelled"
        self.db.commit()
        self.db.refresh(reservation)
        self.audit.write(
            "reservations",
            reservation_id,
            "DELETE",
            f"Reserva #{reservation_id} cancelada",
            performed_by=user.email,
        )
        return {"message": "Reserva cancelada correctamente"}
