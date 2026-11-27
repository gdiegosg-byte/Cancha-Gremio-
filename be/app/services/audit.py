from app.repositories.audit_repository import AuditRepository


def write_audit(db, table_name: str, record_id, action: str, details: str = "", performed_by=None):
    return AuditRepository(db).write(table_name, record_id, action, details, performed_by)
