from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.pricing import TarifaResponse, TarifaCalculada
from app.services.pricing_service import PricingService

router = APIRouter(prefix="/api/v1/tarifas", tags=["tarifas"])


@router.get("", response_model=list[TarifaResponse],
            summary="Listar tarifas",
            description="Devuelve las franjas de precios vigentes por día y horario. Endpoint público.")
def get_tarifas(db: Session = Depends(get_db)):
    return PricingService(db).tiers.list_active()


@router.get("/calcular", response_model=TarifaCalculada,
            summary="Calcular precio de una reserva",
            description="Calcula el precio por hora y total aplicando la franja vigente para la fecha/hora indicadas. "
                        "Si ninguna franja aplica, usa el precio base de la cancha.")
def calcular_tarifa(
    start: datetime = Query(..., description="Inicio de la reserva (ISO 8601)"),
    end: datetime | None = Query(default=None, description="Fin de la reserva (opcional)"),
    field_id: int | None = Query(default=None, description="Cancha para usar el precio base como respaldo"),
    db: Session = Depends(get_db),
):
    result = PricingService(db).calculate(start, end, field_id)
    return TarifaCalculada(
        tier=TarifaResponse.model_validate(result["tier"]) if result["tier"] else None,
        tier_name=result["tier_name"],
        price_per_hour=result["price_per_hour"],
        hours=result["hours"],
        total_price=result["total_price"],
    )
