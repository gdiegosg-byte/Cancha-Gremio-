from app.repositories.audit_repository import AuditRepository
from app.repositories.event_repository import EventRepository
from app.repositories.field_repository import FieldRepository
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

VALID_EVENT_TYPES = {"MAINTENANCE", "TOURNAMENT", "LEAGUE", "SPECIAL", "PRIVATE_EVENT"}


class EventService:
    def __init__(self, db):
        self.db = db
        self.events = EventRepository(db)
        self.fields = FieldRepository(db)
        self.audit = AuditRepository(db)

    @staticmethod
    def _map_tipo(event_type):
        if event_type == "LEAGUE":
            return "liga"
        if event_type in ("SPECIAL", "PRIVATE_EVENT"):
            return "evento_especial"
        return "torneo"

    def list(self):
        events = self.events.list_non_maintenance()
        fields = {field.id: field for field in self.fields.list_all()}
        result = []
        for event in events:
            field = fields.get(event.field_id)
            result.append({
                "id": str(event.id),
                "titulo": event.name,
                "descripcion": event.description,
                "tipo": self._map_tipo(event.event_type),
                "fecha": event.start_time.strftime("%Y-%m-%d") if event.start_time else "",
                "horaInicio": event.start_time.strftime("%H:%M") if event.start_time else "00:00",
                "horaFin": event.end_time.strftime("%H:%M") if event.end_time else "00:00",
                "cupos": 10,
                "cuposOcupados": 0,
                "precio": 0,
                "activo": True,
                "cancha_id": event.field_id,
                "cancha": field.name if field else f"Cancha {event.field_id}",
                "superficie": field.surface_type if field else "Sintética",
                "capacidad": field.capacity if field else 10,
            })
        return result

    def create(self, data, admin):
        if not self.fields.get(data.field_id):
            raise NotFoundError("Cancha no encontrada")
        if data.event_type not in VALID_EVENT_TYPES:
            raise ValidationError(f"Tipo de evento inválido: {data.event_type}")
        if data.end_time <= data.start_time:
            raise ValidationError("La fecha de inicio debe ser anterior a la de fin")
        overlap = self.events.has_overlap(data.field_id, data.start_time, data.end_time)
        if overlap:
            raise ConflictError(f"Ya existe un evento/mantenimiento en ese horario ({overlap.name})")
        event = self.events.create({
            "field_id": data.field_id,
            "name": data.name.strip(),
            "description": data.description or "",
            "start_time": data.start_time,
            "end_time": data.end_time,
            "event_type": data.event_type,
        })
        self.audit.write(
            "events",
            event.id,
            "CREATE",
            f"Evento creado: {event.name} ({event.event_type}) en cancha {event.field_id}",
            performed_by=admin.email,
        )
        return event

    def update(self, event_id: int, data, admin):
        event = self.events.get(event_id)
        if not event:
            raise NotFoundError("Evento no encontrado")
        has_time = (data.start_time is not None) or (data.end_time is not None)
        start = data.start_time if data.start_time is not None else event.start_time
        end = data.end_time if data.end_time is not None else event.end_time
        if has_time and end <= start:
            raise ValidationError("La fecha de inicio debe ser anterior a la de fin")
        field_id = data.field_id if data.field_id is not None else event.field_id
        if field_id != event.field_id or has_time:
            if not self.fields.get(field_id):
                raise NotFoundError("Cancha no encontrada")
            overlap = self.events.has_overlap(field_id, start, end, exclude_id=event.id)
            if overlap:
                raise ConflictError(f"Ya existe un evento/mantenimiento en ese horario ({overlap.name})")
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is None:
                continue
            if key == "name":
                event.name = value.strip()
            elif key == "description":
                event.description = value or ""
            else:
                setattr(event, key, value)
        event = self.events.save(event)
        self.audit.write("events", event.id, "UPDATE", f"Evento actualizado: {event.name}", performed_by=admin.email)
        return event

    def delete(self, event_id: int, admin):
        event = self.events.get(event_id)
        if not event:
            raise NotFoundError("Evento no encontrado")
        name = event.name
        self.events.delete(event)
        self.audit.write("events", event_id, "DELETE", f"Evento eliminado: {name}", performed_by=admin.email)
        return {"message": "Evento eliminado correctamente"}
