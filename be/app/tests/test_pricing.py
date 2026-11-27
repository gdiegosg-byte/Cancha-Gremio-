from datetime import date, datetime, time

from app.models.field import Field
from app.models.pricing_tier import PricingTier
from app.services.festivos import es_festivo, get_holidays
from app.services.pricing_service import day_type_for, get_hour_price, resolve_tier


def make_field(db, price=40000):
    field = Field(
        name="Cancha Tarifas",
        price_per_hour=price,
        surface_type="SYNTHETIC",
        capacity=10,
        length_meters=40,
        width_meters=20,
        available_hour_start="06:00",
        available_hour_end="22:00",
        is_active=True,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


def make_tier(db, day_type, start, end, price, active=True):
    tier = PricingTier(
        name=f"Franja {day_type}",
        day_type=day_type,
        start_time=time(start, 0),
        end_time=time(end, 0),
        price_min=price,
        price_max=price,
        price=price,
        is_active=active,
    )
    db.add(tier)
    db.commit()
    db.refresh(tier)
    return tier


def test_day_type_for_weekday():
    assert day_type_for(datetime(2026, 3, 2, 10, 0)) == "weekday"


def test_day_type_for_saturday():
    assert day_type_for(datetime(2026, 3, 7, 10, 0)) == "saturday"


def test_day_type_for_sunday():
    assert day_type_for(datetime(2026, 3, 8, 10, 0)) == "sunday_holiday"


def test_colombian_holidays_are_detected():
    assert es_festivo(date(2026, 1, 1))
    assert not es_festivo(date(2026, 3, 2))
    assert date(2026, 12, 25) in get_holidays(2026)


def test_resolve_tier_returns_active_matching_frange(db):
    make_tier(db, "weekday", 6, 10, 25000)
    tier = resolve_tier(db, datetime(2026, 3, 2, 8, 0))
    assert tier is not None
    assert tier.price == 25000


def test_resolve_tier_ignores_inactive_tiers(db):
    make_tier(db, "weekday", 6, 22, 25000, active=False)
    assert resolve_tier(db, datetime(2026, 3, 2, 8, 0)) is None


def test_get_hour_price_uses_base_price_without_tier(db):
    field = make_field(db, price=40000)
    price, tier = get_hour_price(db, field, datetime(2026, 3, 2, 8, 0))
    assert price == 40000
    assert tier is None


def test_get_hour_price_uses_tier_price(db):
    field = make_field(db, price=40000)
    make_tier(db, "weekday", 6, 22, 30000)
    price, tier = get_hour_price(db, field, datetime(2026, 3, 2, 8, 0))
    assert price == 30000
    assert tier is not None
