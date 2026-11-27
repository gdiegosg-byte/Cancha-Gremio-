from app.repositories.audit_repository import AuditRepository
from app.repositories.field_repository import FieldRepository
from app.services.exceptions import ConflictError, NotFoundError


class FieldService:
    def __init__(self, db):
        self.db = db
        self.fields = FieldRepository(db)
        self.audit = AuditRepository(db)

    def list_active(self):
        return self.fields.list_active()

    def list_all(self):
        return self.fields.list_all()

    def get(self, field_id: int):
        field = self.fields.get(field_id)
        if not field:
            raise NotFoundError("Cancha no encontrada")
        return field

    def create(self, data, admin):
        duplicate = self.fields.get_by_name(data.name)
        if duplicate:
            raise ConflictError(f"Ya existe una cancha con el nombre '{data.name}'")
        field = self.fields.create(data.model_dump())
        self.audit.write("fields", field.id, "CREATE", f"Cancha creada: {field.name}", performed_by=admin.email)
        return field

    def update(self, field_id: int, data, admin):
        field = self.get(field_id)
        if data.name is not None and data.name != field.name:
            duplicate = self.fields.get_by_name(data.name, exclude_id=field_id)
            if duplicate:
                raise ConflictError(f"Ya existe una cancha con el nombre '{data.name}'")
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is None:
                continue
            setattr(field, key, value)
        field = self.fields.save(field)
        self.audit.write("fields", field.id, "UPDATE", f"Cancha actualizada: {field.name}", performed_by=admin.email)
        return field

    def deactivate(self, field_id: int, admin):
        field = self.get(field_id)
        field.is_active = False
        self.db.commit()
        self.audit.write("fields", field_id, "DELETE", f"Cancha desactivada: {field.name}", performed_by=admin.email)
        return {"message": "Cancha desactivada correctamente"}
