from datetime import datetime

from app.repositories.audit_repository import AuditRepository
from app.repositories.event_repository import EventRepository
from app.repositories.field_repository import FieldRepository
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

FECHA_HORA = "%Y-%m-%d %H:%M"


class MaintenanceService:
    def __init__(self, db):
        self.db = db
        self.events = EventRepository(db)
        self.fields = FieldRepository(db)
        self.audit = AuditRepository(db)

    @staticmethod
    def _parse_fecha_hora(fecha: str, hora: str) -> datetime:
        try:
            return datetime.strptime(f"{fecha} {hora}", FECHA_HORA)
        except ValueError as exc:
            raise ValidationError("Formato de fecha u hora inválido (use YYYY-MM-DD y HH:MM)") from exc

    @staticmethod
    def _serialize(maintenance):
        return {
            "id": str(maintenance.id),
            "cancha": maintenance.field_id,
            "fecha": maintenance.start_time.strftime("%Y-%m-%d") if maintenance.start_time else "",
            "horaInicio": maintenance.start_time.strftime("%H:%M") if maintenance.start_time else "",
            "horaFin": maintenance.end_time.strftime("%H:%M") if maintenance.end_time else "",
            "descripcion": maintenance.name + (" - " + maintenance.description if maintenance.description else ""),
            "proveedor": "Externo",
        }

    def _check_solape(self, cancha: int, start: datetime, end: datetime, exclude_id: int = None):
        overlap = self.events.has_overlap(cancha, start, end, exclude_id=exclude_id)
        if overlap:
            raise ConflictError(f"Ya existe una reserva/evento en ese horario ({overlap.name})")

    def list(self):
        return [self._serialize(item) for item in self.events.list_maintenance()]

    def create(self, data, admin):
        if not self.fields.get(data.cancha):
            raise NotFoundError("Cancha no encontrada")
        start = self._parse_fecha_hora(data.fecha, data.horaInicio)
        end = self._parse_fecha_hora(data.fecha, data.horaFin)
        if end <= start:
            raise ValidationError("La hora de fin debe ser posterior a la de inicio")
        self._check_solape(data.cancha, start, end)
        maintenance = self.events.create({
            "field_id": data.cancha,
            "name": "Mantenimiento",
            "description": data.descripcion.strip() + (f" (Proveedor: {data.proveedor})" if data.proveedor else ""),
            "start_time": start,
            "end_time": end,
            "event_type": "MAINTENANCE",
        })
        self.audit.write(
            "events",
            maintenance.id,
            "CREATE",
            f"Mantenimiento creado en cancha {data.cancha}: {start} - {end} ({data.proveedor or 'Externo'})",
            performed_by=admin.email,
        )
        return self._serialize(maintenance)

    def update(self, maintenance_id: int, data, admin):
        maintenance = self.events.get_maintenance(maintenance_id)
        if not maintenance:
            raise NotFoundError("Mantenimiento no encontrado")
        cancha = data.cancha if data.cancha is not None else maintenance.field_id
        if not self.fields.get(cancha):
            raise NotFoundError("Cancha no encontrada")
        fecha = data.fecha if data.fecha is not None else maintenance.start_time.strftime("%Y-%m-%d")
        h_inicio = data.horaInicio if data.horaInicio is not None else maintenance.start_time.strftime("%H:%M")
        h_fin = data.horaFin if data.horaFin is not None else maintenance.end_time.strftime("%H:%M")
        start = self._parse_fecha_hora(fecha, h_inicio)
        end = self._parse_fecha_hora(fecha, h_fin)
        if end <= start:
            raise ValidationError("La hora de fin debe ser posterior a la de inicio")
        self._check_solape(cancha, start, end, exclude_id=maintenance_id)
        maintenance.field_id = cancha
        maintenance.start_time = start
        maintenance.end_time = end
        if data.descripcion is not None or data.proveedor is not None:
            base_desc = data.descripcion.strip() if data.descripcion is not None else maintenance.description.rsplit(" (Proveedor:", 1)[0].strip()
            if data.proveedor is not None:
                base_desc = f"{base_desc} (Proveedor: {data.proveedor})"
            maintenance.description = base_desc
        maintenance = self.events.save(maintenance)
        self.audit.write(
            "events",
            maintenance_id,
            "UPDATE",
            f"Mantenimiento actualizado en cancha {cancha}",
            performed_by=admin.email,
        )
        return self._serialize(maintenance)

    def delete(self, maintenance_id: int, admin):
        maintenance = self.events.get_maintenance(maintenance_id)
        if not maintenance:
            raise NotFoundError("Mantenimiento no encontrado")
        self.events.delete(maintenance)
        self.audit.write(
            "events",
            maintenance_id,
            "DELETE",
            f"Mantenimiento eliminado en cancha {maintenance.field_id}",
            performed_by=admin.email,
        )
        return None
