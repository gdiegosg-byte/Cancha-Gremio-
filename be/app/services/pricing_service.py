from datetime import datetime, time

from app.models.field import Field
from app.models.pricing_tier import PricingTier
from app.repositories.field_repository import FieldRepository
from app.repositories.pricing_repository import PricingRepository
from app.services.exceptions import NotFoundError
from app.services.festivos import es_festivo


def _minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def day_type_for(dt: datetime) -> str:
    if dt.weekday() == 6 or es_festivo(dt.date()):
        return "sunday_holiday"
    if dt.weekday() == 5:
        return "saturday"
    return "weekday"


class PricingService:
    def __init__(self, db):
        self.db = db
        self.tiers = PricingRepository(db)
        self.fields = FieldRepository(db)

    def resolve_tier(self, dt: datetime) -> PricingTier | None:
        day_type = day_type_for(dt)
        mins = dt.hour * 60 + dt.minute
        for tier in self.tiers.list_by_day_type(day_type):
            start, end = _minutes(tier.start_time), _minutes(tier.end_time)
            if start <= mins <= end:
                return tier
        return None

    def get_hour_price(self, field: Field, start_time: datetime) -> tuple[float, PricingTier | None]:
        tier = self.resolve_tier(start_time)
        if tier:
            return tier.price, tier
        return field.price_per_hour, None

    def calculate(self, start: datetime, end: datetime | None, field_id: int | None):
        field = self.fields.get(field_id) if field_id else None
        if field_id and not field:
            raise NotFoundError("Cancha no encontrada")
        if field:
            price_per_hour, tier = self.get_hour_price(field, start)
        else:
            tier = self.resolve_tier(start)
            if not tier:
                raise NotFoundError("No hay tarifa vigente para ese horario")
            price_per_hour = tier.price
        hours = 1
        if end and end > start:
            hours = round(max((end - start).total_seconds() / 3600, 1), 2)
        return {
            "tier": tier,
            "tier_name": tier.name if tier else None,
            "price_per_hour": price_per_hour,
            "hours": hours,
            "total_price": round(price_per_hour * hours, 2),
        }


def resolve_tier(db, dt: datetime) -> PricingTier | None:
    return PricingService(db).resolve_tier(dt)


def get_hour_price(db, field: Field, start_time: datetime) -> tuple[float, PricingTier | None]:
    return PricingService(db).get_hour_price(field, start_time)
