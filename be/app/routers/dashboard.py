from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_admin)])


@router.get("/stats", summary="Estadísticas del dashboard",
            description="KPIs para el home: reservas hoy, ingresos por día/mes, pendientes, ocupación promedio, clientes y próximos eventos.")
def get_dashboard_stats(db: Session = Depends(get_db)):
    return DashboardService(db).stats()


@router.get("/reporte", summary="Reporte parametrizado de reservas",
            description="Devuelve las reservas de un mes con filtros opcionales por cancha y estado, más un resumen agregado (ingresos, totales).")
def get_reporte(
    year: int = Query(..., description="Año del reporte"),
    month: int = Query(..., description="Mes del reporte (1-12)"),
    field_id: int | None = Query(default=None, description="Filtrar por cancha"),
    estado: str | None = Query(default=None, description="Filtrar por estado: pending, confirmed, cancelled"),
    db: Session = Depends(get_db),
):
    return DashboardService(db).reporte(year, month, field_id, estado)


@router.get("/export", summary="Exportar reporte a CSV",
            description="Genera un CSV descargable con las reservas del mes (filtrable por cancha y estado).")
def export_report(
    year: int = Query(..., description="Año del reporte"),
    month: int = Query(..., description="Mes del reporte (1-12)"),
    field_id: int | None = Query(default=None, description="Filtrar por cancha"),
    estado: str | None = Query(default=None, description="Filtrar por estado"),
    db: Session = Depends(get_db),
):
    content, filename = DashboardService(db).export_csv(year, month, field_id, estado)
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
