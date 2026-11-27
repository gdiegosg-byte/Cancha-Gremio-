from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository):
    def write(self, table_name: str, record_id: int | None, action: str, details: str = "", performed_by: str | None = None):
        entry = AuditLog(
            table_name=table_name,
            record_id=record_id,
            action=action,
            details=details,
            performed_by=performed_by,
        )
        self.db.add(entry)
        self.db.commit()
        return entry
