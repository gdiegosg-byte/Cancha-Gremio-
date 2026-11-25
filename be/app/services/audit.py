# ¿Qué? Servicio de auditoría reutilizable
# ¿Para qué? Registrar acciones críticas para trazabilidad
# ¿Impacto? Permite cumplir el checklist de auditoría de la BD

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def write_audit(db: Session, table_name: str, record_id, action: str, details: str = "", performed_by=None):
    log = AuditLog(
        table_name=table_name,
        record_id=record_id,
        action=action,
        details=details,
        performed_by=performed_by,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(log)
    db.commit()