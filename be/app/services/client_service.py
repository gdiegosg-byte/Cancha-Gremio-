from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import NotFoundError, ValidationError


class ClientService:
    def __init__(self, db):
        self.db = db
        self.users = UserRepository(db)
        self.audit = AuditRepository(db)

    @staticmethod
    def _serialize(user, total_reservas):
        return {
            "id_usuario": user.id,
            "nombre": user.name,
            "correo": user.email,
            "telefono": user.phone,
            "estado": "activo" if user.is_active else "inactivo",
            "fecha_registro": user.created_at.strftime("%Y-%m-%d") if user.created_at else "",
            "total_reservas": total_reservas,
            "impuntualidades": user.punctuality_strikes or 0,
            "motivo_bloqueo": user.block_reason,
        }

    def list(self):
        counts = self.users.reservation_counts()
        return [self._serialize(user, counts.get(user.id, 0)) for user in self.users.list_clients()]

    def _get(self, user_id: int):
        user = self.users.get(user_id)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        return user

    def toggle_status(self, user_id: int, payload: dict, admin):
        user = self._get(user_id)
        estado = payload.get("estado")
        if estado == "activo":
            user.is_active = True
            user.block_reason = None
        elif estado == "inactivo":
            user.is_active = False
        else:
            raise ValidationError("Estado inválido: use 'activo' o 'inactivo'")
        self.db.commit()
        self.audit.write("users", user_id, "UPDATE", f"Cliente {user.name}: estado -> {estado}", performed_by=admin.email)
        return {"message": "Estado actualizado correctamente", "estado": "activo" if user.is_active else "inactivo"}

    def add_strike(self, user_id: int, admin):
        user = self._get(user_id)
        strikes = (user.punctuality_strikes or 0) + 1
        user.punctuality_strikes = strikes
        blocked = False
        if strikes >= 3:
            user.is_active = False
            user.block_reason = "3 impuntualidades consecutivas"
            blocked = True
        self.db.commit()
        self.db.refresh(user)
        self.audit.write(
            "users",
            user_id,
            "UPDATE",
            f"Cliente {user.name}: impuntualidad #{strikes}" + (" -> INHABILITADO" if blocked else ""),
            performed_by=admin.email,
        )
        return {
            "message": "Impuntualidad registrada correctamente",
            "impuntualidades": user.punctuality_strikes,
            "bloqueado": blocked,
        }

    def reset_strikes(self, user_id: int, admin):
        user = self._get(user_id)
        user.punctuality_strikes = 0
        self.db.commit()
        self.db.refresh(user)
        self.audit.write(
            "users",
            user_id,
            "UPDATE",
            f"Cliente {user.name}: contador de impuntualidades reiniciado",
            performed_by=admin.email,
        )
        return {"message": "Contador de impuntualidades reiniciado", "impuntualidades": 0}

    def update(self, user_id: int, data, admin):
        user = self._get(user_id)
        if data.nombre is not None:
            if data.nombre.strip().lower() in ("", "null"):
                raise ValidationError("El nombre no puede estar vacío")
            user.name = data.nombre.strip()
        if data.correo is not None:
            correo = data.correo.strip()
            if "@" not in correo:
                raise ValidationError("Correo electrónico inválido")
            if self.users.email_exists(correo, exclude_id=user_id):
                raise ValidationError("El correo ya está en uso por otro usuario")
            user.email = correo
        if data.telefono is not None:
            user.phone = data.telefono.strip()
        self.db.commit()
        self.db.refresh(user)
        self.audit.write("users", user_id, "UPDATE", f"Cliente actualizado: {user.name}", performed_by=admin.email)
        return self._serialize(user, 0)
