import pytest

from app.utils.dates import month_bounds, month_name_es


def test_month_bounds_returns_first_day_of_month_and_next_month():
    start, end = month_bounds(2026, 3)
    assert start.isoformat() == "2026-03-01T00:00:00"
    assert end.isoformat() == "2026-04-01T00:00:00"


def test_month_bounds_rolls_over_december():
    start, end = month_bounds(2026, 12)
    assert start.year == 2026
    assert end.isoformat() == "2027-01-01T00:00:00"


@pytest.mark.parametrize("year,month", [(2026, 0), (2026, 13)])
def test_month_bounds_rejects_invalid_month(year, month):
    with pytest.raises(ValueError, match="mes"):
        month_bounds(year, month)


@pytest.mark.parametrize("year", [1999, 2101])
def test_month_bounds_rejects_invalid_year(year):
    with pytest.raises(ValueError, match="año"):
        month_bounds(year, 3)


def test_month_name_es():
    assert month_name_es(1) == "Enero"
    assert month_name_es(12) == "Diciembre"


def test_month_name_es_rejects_invalid_month():
    with pytest.raises(ValueError):
        month_name_es(13)
