import bcrypt
from datetime import datetime, timedelta

from app.config import settings
from app.repositories.audit_repository import AuditRepository
from app.repositories.auth_token_repository import AuthTokenRepository
from app.repositories.token_blacklist_repository import TokenBlacklistRepository
from app.repositories.user_repository import UserRepository
from app.services import security
from app.services.exceptions import ForbiddenError, LockedError, NotFoundError, UnauthorizedError, ValidationError

ALLOWED_SPECIAL = set("@$!%*?&#._-")
MIN_PASSWORD_LENGTH = 8


class AuthService:
    def __init__(self, db):
        self.db = db
        self.users = UserRepository(db)
        self.tokens = AuthTokenRepository(db)
        self.blacklist = TokenBlacklistRepository(db)
        self.audit = AuditRepository(db)

    @staticmethod
    def validate_password(password: str):
        errors = []
        if len(password) < MIN_PASSWORD_LENGTH:
            errors.append(f"Mínimo {MIN_PASSWORD_LENGTH} caracteres")
        invalid_chars = set()
        for ch in password:
            if ch.isalnum() or ch in ALLOWED_SPECIAL:
                continue
            invalid_chars.add(ch)
        if invalid_chars:
            chars_str = ", ".join(repr(c) for c in sorted(invalid_chars))
            errors.append(f"Caracteres no permitidos: {chars_str}")
            errors.append(f"Caracteres especiales permitidos: {''.join(sorted(ALLOWED_SPECIAL))}")
        if errors:
            raise ValidationError(" | ".join(errors))

    @staticmethod
    def _serialize_user(user) -> dict:
        return {
            "id_usuario": user.id,
            "nombre": user.name,
            "apellido": "",
            "correo": user.email,
            "telefono": user.phone or "",
            "id_rol": 1 if user.role == "ADMIN" else 2,
            "nombre_rol": "admin" if user.role == "ADMIN" else "cliente",
            "correo_verificado": bool(user.is_verified),
        }

    def _issue_tokens(self, user_id: int, version: int = 0) -> dict:
        extra = {"ver": version}
        access, a_payload = security.encode_token(
            user_id, "access", settings.access_token_expire_minutes, extra=extra
        )
        refresh, r_payload = security.encode_token(
            user_id, "refresh", settings.refresh_token_expire_minutes, extra=extra
        )
        return {
            "token": access,
            "access_token": access,
            "refresh_token": refresh,
            "expires_at": a_payload["exp"],
            "refresh_expires_at": r_payload["exp"],
        }

    def _get_user(self, user_id: int):
        user = self.users.get(user_id)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        return user

    def login(self, data):
        user = self.users.get_by_email(data.correo)
        if not user:
            raise UnauthorizedError("Credenciales incorrectas")
        now = datetime.utcnow()
        if user.locked_until and user.locked_until > now:
            minutes_left = int((user.locked_until - now).total_seconds() // 60) + 1
            raise LockedError(
                f"Cuenta bloqueada temporalmente por intentos fallidos. Intenta en {minutes_left} min."
            )
        password_hash = user.password.encode("utf-8") if isinstance(user.password, str) else user.password
        if not bcrypt.checkpw(data.password.encode("utf-8"), password_hash):
            user.failed_attempts = (user.failed_attempts or 0) + 1
            if user.failed_attempts >= settings.max_login_attempts:
                user.locked_until = now + timedelta(minutes=settings.lock_minutes)
                user.failed_attempts = 0
                self.db.commit()
                raise LockedError(
                    f"Demasiados intentos fallidos. Cuenta bloqueada {settings.lock_minutes} minutos."
                )
            self.db.commit()
            attempts_left = settings.max_login_attempts - user.failed_attempts
            raise UnauthorizedError(f"Credenciales incorrectas. Intentos restantes: {attempts_left}.")
        user.failed_attempts = 0
        user.locked_until = None
        self.db.commit()
        if not user.is_verified:
            raise ForbiddenError(
                "Correo no confirmado. Revisa tu bandeja de entrada para completar el registro."
            )
        result = self._issue_tokens(user.id, user.session_version or 0)
        result["usuario"] = self._serialize_user(user)
        return result

    def register(self, data):
        self.validate_password(data.password)
        if self.users.get_by_email(data.correo):
            raise ValidationError("El correo ya está en uso")
        phone = data.telefono or ""
        if phone and self.users.get_by_phone(phone):
            raise ValidationError("El teléfono ya está en uso")
        hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
        user = self.users.create({
            "name": data.nombre,
            "email": data.correo,
            "phone": data.telefono or "",
            "password": hashed,
            "role": "CLIENT",
            "is_active": True,
            "is_verified": True,
            "failed_attempts": 0,
            "locked_until": None,
        })
        self.audit.write(
            "users",
            user.id,
            "CREATE_REGISTER",
            "Nuevo registro de cliente (cuenta activa sin confirmación de correo)",
            performed_by=user.email,
        )
        raw = self.tokens.issue(
            user.id,
            "REGISTER",
            security.generate_token(),
            settings.confirmation_token_expire_hours * 60,
        )
        confirmation_url = f"http://localhost:5173/confirmar-correo?token={raw}"
        smtp_configured = bool(settings.smtp_host)
        security.send_email(
            user.email,
            "Confirma tu registro en Cancha Gremio",
            body_text=f"Completa tu registro abriendo: {confirmation_url}",
            body_html=f"<p>Completa tu registro abriendo el siguiente enlace:</p><p><a href='{confirmation_url}'>{confirmation_url}</a></p>",
        )
        body = {
            "id_usuario": user.id,
            "nombre": user.name,
            "correo": user.email,
            "mensaje": f"Hemos enviado un enlace de confirmación a {user.email}. El enlace expira en {settings.confirmation_token_expire_hours} horas.",
        }
        if not smtp_configured:
            body["confirmation_url"] = confirmation_url
        return body

    def confirm_email(self, token: str) -> dict:
        row = self.tokens.consume(token, "REGISTER")
        user = self._get_user(row.user_id)
        user.is_verified = True
        self.db.commit()
        self.audit.write("users", user.id, "CONFIRM_EMAIL", "Correo de registro confirmado", performed_by=user.email)
        return {"message": "Correo confirmado. Ya puedes iniciar sesión."}

    def forgot_password(self, data):
        user = self.users.get_by_email(data.correo)
        if not user:
            return {
                "mensaje": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
                "reset_url": None,
            }
        self.tokens.revoke_all(user.id, "RESET_PASSWORD")
        raw = self.tokens.issue(
            user.id,
            "RESET_PASSWORD",
            security.generate_token(),
            settings.reset_token_expire_minutes,
        )
        reset_url = f"http://localhost:5173/reset-password?token={raw}"
        smtp_configured = bool(settings.smtp_host)
        security.send_email(
            user.email,
            "Recuperación de contraseña - Cancha Gremio",
            body_text=f"Restablece tu contraseña abriendo: {reset_url}",
            body_html=f"<p>Restablece tu contraseña con este enlace (válido {settings.reset_token_expire_minutes} min):</p><p><a href='{reset_url}'>{reset_url}</a></p>",
        )
        body = {
            "mensaje": f"Si el correo está registrado, recibirás un enlace válido por {settings.reset_token_expire_minutes} minutos.",
            "reset_url": None,
        }
        if not smtp_configured:
            body["reset_url"] = reset_url
        return body

    def reset_password(self, token: str, data):
        self.validate_password(data.password)
        row = self.tokens.consume(token, "RESET_PASSWORD")
        user = self._get_user(row.user_id)
        user.password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
        user.failed_attempts = 0
        user.locked_until = None
        self.db.commit()
        self.audit.write("users", user.id, "RESET_PASSWORD", "Contraseña restablecida", performed_by=user.email)
        return {"message": "Contraseña actualizada. Ya puedes iniciar sesión."}

    def refresh_access(self, refresh_token: str) -> dict:
        payload = security.decode_token(refresh_token, "refresh")
        jti = payload.get("jti")
        if jti and self.blacklist.is_blacklisted(jti):
            raise UnauthorizedError("Sesión cerrada (token revocado)")
        user_id = int(payload.get("sub", 0))
        user = self.users.get(user_id)
        if not user or not user.is_active:
            raise UnauthorizedError("Usuario no válido")
        if int(payload.get("ver", 0)) != (user.session_version or 0):
            raise UnauthorizedError("Sesión cerrada en todos los dispositivos")
        result = self._issue_tokens(user.id, user.session_version or 0)
        result["usuario"] = self._serialize_user(user)
        return result

    def logout_user(self, token: str, refresh_token: str | None = None):
        payload = security.decode_token(token, "access")
        jti = payload.get("jti")
        if jti:
            expires_at = payload.get("exp")
            self.blacklist.add(
                jti,
                expires_at=datetime.fromtimestamp(expires_at) if expires_at else datetime.utcnow(),
                user_id=int(payload.get("sub", 0)) or None,
            )
        if refresh_token:
            try:
                r_payload = security.decode_token(refresh_token, "refresh")
                r_jti = r_payload.get("jti")
                if r_jti:
                    r_expires = r_payload.get("exp")
                    self.blacklist.add(
                        r_jti,
                        expires_at=datetime.fromtimestamp(r_expires) if r_expires else datetime.utcnow(),
                        user_id=int(r_payload.get("sub", 0)) or None,
                    )
            except Exception:
                pass
        return {"mensaje": "Sesión cerrada correctamente"}

    def logout_all_devices(self, token: str) -> str:
        payload = security.decode_token(token, "access")
        user_id = int(payload.get("sub", 0))
        user = self._get_user(user_id)
        user.session_version = (user.session_version or 0) + 1
        self.db.commit()
        jti = payload.get("jti")
        if jti:
            expires_at = payload.get("exp")
            self.blacklist.add(
                jti,
                expires_at=datetime.fromtimestamp(expires_at) if expires_at else datetime.utcnow(),
                user_id=user.id,
            )
        self.audit.write(
            "users",
            user.id,
            "LOGOUT_ALL",
            "Sesión cerrada en todos los dispositivos",
            performed_by=user.email,
        )
        return "Sesión cerrada en todos los dispositivos"

    def request_account_deletion(self, db_user, password: str) -> dict:
        user = self._get_user(db_user.id)
        password_hash = user.password.encode("utf-8") if isinstance(user.password, str) else user.password
        if not bcrypt.checkpw(password.encode("utf-8"), password_hash):
            raise UnauthorizedError("Contraseña incorrecta")
        raw = self.tokens.issue(
            user.id,
            "DELETE_ACCOUNT",
            security.generate_token(),
            settings.confirmation_token_expire_hours * 60,
        )
        confirmation_url = f"http://localhost:5173/eliminar-cuenta?token={raw}"
        smtp_configured = bool(settings.smtp_host)
        security.send_email(
            user.email,
            "Confirmación de eliminación de cuenta - Cancha Gremio",
            body_text=f"Si realmente deseas eliminar tu cuenta, abre el siguiente enlace (expira en {settings.confirmation_token_expire_hours} horas): {confirmation_url}",
            body_html=f"<p>Hemos recibido una solicitud para eliminar tu cuenta de Cancha Gremio.</p><p>Si realmente deseas continuar, abre este enlace (válido {settings.confirmation_token_expire_hours} horas):</p><p><a href='{confirmation_url}'>{confirmation_url}</a></p><p>Si no solicitaste esto, ignora este correo.</p>",
        )
        body = {
            "mensaje": f"Hemos enviado un enlace de confirmación a {user.email}. La eliminación solo se completa al confirmarlo.",
        }
        if not smtp_configured:
            body["confirmation_url"] = confirmation_url
        return body

    def confirm_account_deletion(self, token: str) -> dict:
        row = self.tokens.consume(token, "DELETE_ACCOUNT")
        user = self._get_user(row.user_id)
        user.name = "Usuario eliminado"
        user.phone = ""
        user.email = f"eliminado-{user.id}@anulado.cancha"
        user.is_active = False
        user.is_verified = False
        user.session_version = (user.session_version or 0) + 1
        self.db.commit()
        self.tokens.revoke_all(user.id, "REGISTER")
        self.tokens.revoke_all(user.id, "RESET_PASSWORD")
        self.tokens.revoke_all(user.id, "DELETE_ACCOUNT")
        self.audit.write(
            "users",
            user.id,
            "DELETE_ACCOUNT",
            "Cuenta eliminada (borrado lógico) y datos anonimizados",
            performed_by=user.email,
        )
        return {"message": "Tu cuenta fue eliminada. Gracias por haber sido parte de Cancha Gremio."}

    def get_profile(self, token):
        payload = security.decode_token(token, "access")
        jti = payload.get("jti")
        if jti and self.blacklist.is_blacklisted(jti):
            raise UnauthorizedError("Token revocado")
        user = self._get_user(int(payload.get("sub", 0)))
        return self._serialize_user(user)
