from datetime import datetime, timedelta

from app.models.event import Event
from app.models.field import Field
from app.tests.conftest import auth_headers


BASE_URL = "/api/v1/reservations"
START = datetime(2030, 1, 7, 10, 0)


def create_field(db, name="Cancha 1", start="06:00", end="22:00", price=40000):
    field = Field(
        name=name,
        description="Cancha sintética de prueba",
        price_per_hour=price,
        surface_type="SYNTHETIC",
        capacity=10,
        length_meters=40,
        width_meters=20,
        available_hour_start=start,
        available_hour_end=end,
        is_active=True,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


def reservation_payload(field_id, start=START, hours=2, **overrides):
    payload = {
        "field_id": field_id,
        "client_name": "Cliente Prueba",
        "client_email": "cliente@test.com",
        "client_phone": "3001234567",
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=hours)).isoformat(),
    }
    payload.update(overrides)
    return payload


def test_create_reservation_requires_auth(client, db):
    field = create_field(db)
    response = client.post(BASE_URL, json=reservation_payload(field.id))
    assert response.status_code == 401


def test_create_reservation_calculates_price(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db)
    response = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["total_price"] == 80000.0
    assert body["status"] == "pending"
    assert body["payment_status"] == "pending"


def test_create_reservation_rejects_overlap(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db)
    client.post(BASE_URL, json=reservation_payload(field.id), headers=headers)
    overlapping = reservation_payload(field.id, start=START + timedelta(hours=1))
    response = client.post(BASE_URL, json=overlapping, headers=headers)
    assert response.status_code == 409
    assert "ya está reservada" in response.json()["detail"]


def test_create_reservation_allows_non_overlapping_slot(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db)
    client.post(BASE_URL, json=reservation_payload(field.id), headers=headers)
    response = client.post(
        BASE_URL,
        json=reservation_payload(field.id, start=START + timedelta(hours=2)),
        headers=headers,
    )
    assert response.status_code == 201


def test_create_reservation_rejects_time_outside_operating_hours(client, db):
    field = create_field(db, end="20:00")
    headers, _ = auth_headers(db)
    payload = reservation_payload(field.id, start=datetime(2030, 1, 7, 21, 0), hours=1)
    response = client.post(BASE_URL, json=payload, headers=headers)
    assert response.status_code == 400
    assert "horario operativo" in response.json()["detail"]


def test_create_reservation_rejects_inverted_time_window(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db)
    payload = reservation_payload(field.id, hours=0)
    response = client.post(BASE_URL, json=payload, headers=headers)
    assert response.status_code == 400


def test_create_reservation_rejects_unknown_field(client, db):
    headers, _ = auth_headers(db)
    response = client.post(BASE_URL, json=reservation_payload(9999), headers=headers)
    assert response.status_code == 404


def test_create_reservation_rejects_event_blocked_slot(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db)
    db.add(Event(
        field_id=field.id,
        name="Mantenimiento",
        start_time=START,
        end_time=START + timedelta(hours=3),
        event_type="MAINTENANCE",
    ))
    db.commit()
    response = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers)
    assert response.status_code == 409
    assert "Horario bloqueado" in response.json()["detail"]


def test_list_reservations_filters_by_status_field_and_search(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db)
    client.post(BASE_URL, json=reservation_payload(field.id, status="confirmed"), headers=headers)
    client.post(BASE_URL, json=reservation_payload(
        field.id,
        start=START + timedelta(hours=2),
        client_name="Otro Cliente",
    ), headers=headers)

    response = client.get(
        f"{BASE_URL}?estado=confirmed&cancha={field.id}&q=Cliente Prueba",
        headers=headers,
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["client_name"] == "Cliente Prueba"


def test_list_reservations_rejects_invalid_status(client, db):
    headers, _ = auth_headers(db)
    response = client.get(f"{BASE_URL}?estado=invalido", headers=headers)
    assert response.status_code == 400


def test_get_reservation_not_found(client, db):
    headers, _ = auth_headers(db)
    response = client.get(f"{BASE_URL}/9999", headers=headers)
    assert response.status_code == 404


def test_owner_can_update_payment_status(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db, email="cliente@test.com")
    created = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers).json()
    response = client.put(
        f"{BASE_URL}/{created['id']}",
        json={"payment_status": "paid"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["payment_status"] == "paid"


def test_non_owner_cannot_update_reservation(client, db):
    field = create_field(db)
    owner_headers, _ = auth_headers(db, email="cliente@test.com")
    created = client.post(BASE_URL, json=reservation_payload(field.id), headers=owner_headers).json()
    other_headers, _ = auth_headers(db, email="otro@test.com")
    response = client.put(
        f"{BASE_URL}/{created['id']}",
        json={"payment_status": "paid"},
        headers=other_headers,
    )
    assert response.status_code == 403


def test_client_cannot_change_schedule(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db, email="cliente@test.com")
    created = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers).json()
    response = client.put(
        f"{BASE_URL}/{created['id']}",
        json={"start_time": (START + timedelta(hours=2)).isoformat()},
        headers=headers,
    )
    assert response.status_code == 403


def test_admin_can_update_reservation_details(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    created = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers).json()
    response = client.put(
        f"{BASE_URL}/{created['id']}",
        json={"status": "confirmed", "client_name": "Cliente Editado"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    assert response.json()["client_name"] == "Cliente Editado"


def test_cancel_reservation_is_logical_delete(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db, email="cliente@test.com")
    created = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers).json()
    response = client.delete(f"{BASE_URL}/{created['id']}", headers=headers)
    assert response.status_code == 200
    assert client.get(f"{BASE_URL}/{created['id']}", headers=headers).json()["status"] == "cancelled"


def test_bulk_create_rolls_back_on_invalid_item(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.post(
        f"{BASE_URL}/bulk",
        json={"items": [
            reservation_payload(field.id),
            reservation_payload(field.id, client_name="Cliente Duplicado"),
        ]},
        headers=headers,
    )
    assert response.status_code == 409
    assert "Error en la reserva #2" in response.json()["detail"]
    assert client.get(BASE_URL, headers=headers).json() == []


def test_bulk_create_returns_created_count(client, db):
    field = create_field(db)
    headers, _ = auth_headers(db, email="admin@test.com", role="ADMIN")
    response = client.post(
        f"{BASE_URL}/bulk",
        json={"items": [
            reservation_payload(field.id),
            reservation_payload(field.id, start=START + timedelta(hours=2)),
        ]},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["creadas"] == 2


def test_login_is_required_for_reporting(client, db):
    assert client.get(BASE_URL).status_code == 401


def test_reservation_price_uses_active_pricing_tier(client, db):
    from datetime import time

    from app.models.pricing_tier import PricingTier
    from app.services.pricing_service import day_type_for

    field = create_field(db, price=40000)
    db.add(PricingTier(
        name="Franja prueba",
        day_type=day_type_for(START),
        start_time=time(0, 0),
        end_time=time(23, 59),
        price_min=25000,
        price_max=25000,
        price=25000,
        is_active=True,
    ))
    db.commit()
    headers, _ = auth_headers(db)
    response = client.post(BASE_URL, json=reservation_payload(field.id), headers=headers)
    assert response.status_code == 201
    assert response.json()["total_price"] == 50000.0
