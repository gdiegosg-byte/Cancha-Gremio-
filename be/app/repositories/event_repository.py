from app.models.event import Event
from app.repositories.base import BaseRepository


class EventRepository(BaseRepository):
    def list_non_maintenance(self):
        return (
            self.db.query(Event)
            .filter(Event.event_type != "MAINTENANCE")
            .order_by(Event.start_time.asc())
            .all()
        )

    def list_maintenance(self):
        return (
            self.db.query(Event)
            .filter(Event.event_type == "MAINTENANCE")
            .order_by(Event.start_time.asc())
            .all()
        )

    def get(self, event_id: int):
        return self.db.query(Event).filter(Event.id == event_id).first()

    def get_maintenance(self, maintenance_id: int):
        return (
            self.db.query(Event)
            .filter(Event.id == maintenance_id, Event.event_type == "MAINTENANCE")
            .first()
        )

    def get_by_name(self, name: str):
        return self.db.query(Event).filter(Event.name.ilike(name)).first()

    def has_overlap(self, field_id: int, start, end, exclude_id=None):
        query = self.db.query(Event).filter(
            Event.field_id == field_id,
            Event.start_time < end,
            Event.end_time > start,
        )
        if exclude_id is not None:
            query = query.filter(Event.id != exclude_id)
        return query.first()

    def create(self, data: dict):
        event = Event(**data)
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def save(self, event):
        self.db.commit()
        self.db.refresh(event)
        return event

    def delete(self, event):
        self.db.delete(event)
        self.db.commit()
