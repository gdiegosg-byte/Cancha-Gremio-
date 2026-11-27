import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger("cancha_gremio")


def hash_token(raw: str) -> str:
    import hashlib

    return hashlib.sha256(raw.encode()).hexdigest()


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def encode_token(subject, token_type: str, expires_minutes: int, extra: dict | None = None):
    jti = uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token, payload


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    if payload.get("type") != expected_type:
        raise HTTPException(status_code=401, detail="Tipo de token no válido")
    return payload


def send_email(to: str, subject: str, body_text: str = "", body_html: str = ""):
    if settings.smtp_host:
        logger.warning("SMTP configurado pero no implementado; enlace no se mostrará en la API.")
        return
    logger.info("EMAIL [dev] para %s -> %s", to, subject)
