class DomainError(Exception):
    status_code = 400
    detail = "Error de aplicación"

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.detail
        super().__init__(self.detail)


class ValidationError(DomainError):
    status_code = 400
    detail = "Datos inválidos"


class NotFoundError(DomainError):
    status_code = 404
    detail = "Recurso no encontrado"


class ConflictError(DomainError):
    status_code = 409
    detail = "Conflicto con el estado actual"


class ForbiddenError(DomainError):
    status_code = 403
    detail = "No autorizado"


class UnauthorizedError(DomainError):
    status_code = 401
    detail = "Autenticación requerida"


class LockedError(DomainError):
    status_code = 423
    detail = "Cuenta bloqueada"
