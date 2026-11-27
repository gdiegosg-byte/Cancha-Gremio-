import hashlib
from datetime import datetime, timedelta, timezone

from app.models.auth_token import AuthToken
from app.repositories.base import BaseRepository
from app.services.exceptions import UnauthorizedError, ValidationError


class AuthTokenRepository(BaseRepository):
    def issue(self, user_id: int, token_type: str, raw: str, expires_minutes: int) -> str:
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)).replace(tzinfo=None)
        self.db.add(AuthToken(
            user_id=user_id,
            token=hashlib.sha256(raw.encode()).hexdigest(),
            token_type=token_type,
            expires_at=expires_at,
        ))
        self.db.commit()
        return raw

    def consume(self, raw: str, token_type: str):
        row = self.db.query(AuthToken).filter(
            AuthToken.token == hashlib.sha256(raw.encode()).hexdigest(),
            AuthToken.token_type == token_type,
        ).first()
        if not row:
            raise UnauthorizedError("Enlace inválido")
        if row.used_at is not None:
            raise ValidationError("Este enlace ya fue utilizado")
        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise ValidationError("Este enlace ha expirado")
        row.used_at = datetime.now(timezone.utc).replace(tzinfo=None)
        self.db.commit()
        return row

    def revoke_all(self, user_id: int, token_type: str):
        self.db.query(AuthToken).filter(
            AuthToken.user_id == user_id,
            AuthToken.token_type == token_type,
            AuthToken.used_at.is_(None),
        ).update({"used_at": datetime.now(timezone.utc).replace(tzinfo=None)})
        self.db.commit()
