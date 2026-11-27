from datetime import datetime

MESES_ES = (
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    if not 1 <= month <= 12:
        raise ValueError("El mes debe estar entre 1 y 12")
    if not 2000 <= year <= 2100:
        raise ValueError("El año debe estar entre 2000 y 2100")
    start = datetime(year, month, 1)
    next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)
    return start, datetime(next_year, next_month, 1)


def month_name_es(month: int) -> str:
    if not 1 <= month <= 12:
        raise ValueError("El mes debe estar entre 1 y 12")
    return MESES_ES[month - 1]
