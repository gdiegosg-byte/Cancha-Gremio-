from app.models.field import Field
from app.repositories.base import BaseRepository


class FieldRepository(BaseRepository):
    def list_active(self):
        return self.db.query(Field).filter(Field.is_active.is_(True)).order_by(Field.id.asc()).all()

    def list_all(self):
        return self.db.query(Field).order_by(Field.id.asc()).all()

    def get(self, field_id: int):
        return self.db.query(Field).filter(Field.id == field_id).first()

    def get_by_name(self, name: str, exclude_id=None):
        query = self.db.query(Field).filter(Field.name.ilike(name))
        if exclude_id is not None:
            query = query.filter(Field.id != exclude_id)
        return query.first()

    def create(self, data: dict):
        field = Field(**data)
        self.db.add(field)
        self.db.commit()
        self.db.refresh(field)
        return field

    def save(self, field):
        self.db.commit()
        self.db.refresh(field)
        return field
