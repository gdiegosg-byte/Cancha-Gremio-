from datetime import datetime

from app.models.field import Field
from app.models.reservation import Reservation
from app.tests.conftest import auth_headers, make_user


def create_field(db, name="Cancha Reporte"):
    field = Field(
        name=name,
        price_per_hour=40000,
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


def create_reservation(db, field_id, day, status, price):
    start = datetime(2026, 3, day, 10, 0)
    reservation = Reservation(
        field_id=field_id,
        client_name=f"Cliente {day}",
        client_email=f"cliente{day}@test.com",
        client_phone="3001234567",
        start_time=start,
        end_time=start.replace(hour=12),
        total_price=price,
        status=status,
        payment_status="paid" if status == "confirmed" else "pending",
    )
    db.add(reservation)
    db.commit()
    return reservation


def test_dashboard_stats_requires_admin(client, db):
    headers, _ = auth_headers(db, email="user@test.com")
    response = client.get("/dashboard/stats", headers=headers)
    assert response.status_code == 403


def test_dashboard_stats_returns_kpis(client, db):
    make_user(db, "cliente@test.com")
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.get("/dashboard/stats", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["totalReservasHoy"] == 0
    assert body["clientesRegistrados"] == 1
    assert body["ingresosMes"] == 0


def test_reporte_aggregates_only_confirmed_income(client, db):
    field = create_field(db)
    create_reservation(db, field.id, 3, "confirmed", 80000)
    create_reservation(db, field.id, 4, "pending", 80000)
    create_reservation(db, field.id, 5, "cancelled", 80000)
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")

    response = client.get("/dashboard/reporte?year=2026&month=3", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["periodo"]["mes"] == "Marzo"
    assert body["resumen"]["total_reservas"] == 3
    assert body["resumen"]["confirmadas"] == 1
    assert body["resumen"]["pendientes"] == 1
    assert body["resumen"]["canceladas"] == 1
    assert body["resumen"]["ingresos_confirmados"] == 80000.0


def test_reporte_filters_by_status_and_field(client, db):
    field = create_field(db)
    other = create_field(db, name="Cancha 2")
    create_reservation(db, field.id, 3, "confirmed", 80000)
    create_reservation(db, other.id, 4, "confirmed", 90000)
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")

    response = client.get(
        f"/dashboard/reporte?year=2026&month=3&field_id={field.id}&estado=confirmed",
        headers=headers,
    )
    assert response.status_code == 200
    assert len(response.json()["reservas"]) == 1
    assert response.json()["reservas"][0]["cancha"] == field.id


def test_reporte_rejects_invalid_month(client, db):
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.get("/dashboard/reporte?year=2026&month=13", headers=headers)
    assert response.status_code == 400
    assert "mes" in response.json()["detail"]


def test_reporte_rejects_invalid_year(client, db):
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.get("/dashboard/reporte?year=1999&month=3", headers=headers)
    assert response.status_code == 400
    assert "año" in response.json()["detail"]


def test_reporte_rejects_invalid_status(client, db):
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.get("/dashboard/reporte?year=2026&month=3&estado=otro", headers=headers)
    assert response.status_code == 400


def test_export_report_returns_csv(client, db):
    field = create_field(db)
    create_reservation(db, field.id, 3, "confirmed", 80000)
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.get("/dashboard/export?year=2026&month=3", headers=headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "reporte-2026-03.csv" in response.headers["content-disposition"]
    assert "Cliente 3" in response.text
