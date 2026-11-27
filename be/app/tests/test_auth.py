from app.tests.conftest import make_user


REGISTER = {
    "nombre": "Ana Prueba",
    "apellido": "Gómez",
    "correo": "ana@test.com",
    "password": "Password1!",
    "telefono": "3001112233",
}


def test_register_creates_user(client):
    response = client.post("/api/v1/auth/registro", json=REGISTER)
    assert response.status_code == 200
    body = response.json()
    assert body["correo"] == REGISTER["correo"]
    assert body["id_usuario"] > 0


def test_register_returns_confirmation_link_in_dev_mode(client):
    response = client.post("/api/v1/auth/registro", json=REGISTER)
    assert "confirmation_url" in response.json()


def test_register_rejects_duplicate_email(client):
    client.post("/api/v1/auth/registro", json=REGISTER)
    response = client.post("/api/v1/auth/registro", json=REGISTER)
    assert response.status_code == 400
    assert "ya está en uso" in response.json()["detail"]


def test_register_rejects_short_password(client):
    payload = {**REGISTER, "password": "abc"}
    response = client.post("/api/v1/auth/registro", json=payload)
    assert response.status_code == 400
    assert "Mínimo 8 caracteres" in response.json()["detail"]


def test_register_rejects_invalid_special_character(client):
    payload = {**REGISTER, "password": "Password1~"}
    response = client.post("/api/v1/auth/registro", json=payload)
    assert response.status_code == 400
    assert "Caracteres no permitidos" in response.json()["detail"]


def test_login_returns_access_and_refresh_tokens(client, db):
    make_user(db, "login@test.com")
    response = client.post(
        "/api/v1/auth/login",
        json={"correo": "login@test.com", "password": "Password1!"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token"] == body["access_token"]
    assert body["refresh_token"]
    assert body["usuario"]["correo"] == "login@test.com"


def test_login_rejects_wrong_password(client, db):
    make_user(db, "wrong@test.com")
    response = client.post(
        "/api/v1/auth/login",
        json={"correo": "wrong@test.com", "password": "OtraPass1!"},
    )
    assert response.status_code == 401
    assert "Intentos restantes" in response.json()["detail"]


def test_login_rejects_unverified_account(client, db):
    make_user(db, "unverified@test.com", verified=False)
    response = client.post(
        "/api/v1/auth/login",
        json={"correo": "unverified@test.com", "password": "Password1!"},
    )
    assert response.status_code == 403
    assert "Correo no confirmado" in response.json()["detail"]


def test_login_locks_account_after_failed_attempts(client, db):
    make_user(db, "locked@test.com")
    payload = {"correo": "locked@test.com", "password": "MalaPass1!"}
    for _ in range(5):
        response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 423
    assert "bloqueada" in response.json()["detail"]


def test_profile_requires_valid_token(client, db):
    response = client.get("/api/v1/auth/perfil", headers={"Authorization": "Bearer basura"})
    assert response.status_code == 401


def test_profile_returns_user_data(client, db):
    make_user(db, "profile@test.com")
    login = client.post(
        "/api/v1/auth/login",
        json={"correo": "profile@test.com", "password": "Password1!"},
    ).json()
    response = client.get(
        "/api/v1/auth/perfil",
        headers={"Authorization": f"Bearer {login['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()["correo"] == "profile@test.com"


def test_refresh_rotates_tokens(client, db):
    make_user(db, "refresh@test.com")
    login = client.post(
        "/api/v1/auth/login",
        json={"correo": "refresh@test.com", "password": "Password1!"},
    ).json()
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login["refresh_token"]},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_logout_revokes_access_token(client, db):
    make_user(db, "logout@test.com")
    login = client.post(
        "/api/v1/auth/login",
        json={"correo": "logout@test.com", "password": "Password1!"},
    ).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    response = client.post("/api/v1/auth/logout", headers=headers)
    assert response.status_code == 200
    assert client.get("/api/v1/auth/perfil", headers=headers).status_code == 401


def test_forgot_password_does_not_reveal_unknown_email(client):
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"correo": "noexiste@test.com"},
    )
    assert response.status_code == 200
    assert response.json()["reset_url"] is None


def test_reset_password_allows_login_with_new_password(client, db):
    make_user(db, "reset@test.com")
    forgot = client.post(
        "/api/v1/auth/forgot-password",
        json={"correo": "reset@test.com"},
    ).json()
    token = forgot["reset_url"].split("token=")[1]
    response = client.post(
        f"/api/v1/auth/reset-password/{token}",
        json={"password": "NuevaPass1!"},
    )
    assert response.status_code == 200
    login = client.post(
        "/api/v1/auth/login",
        json={"correo": "reset@test.com", "password": "NuevaPass1!"},
    )
    assert login.status_code == 200


def test_confirmation_link_is_single_use(client):
    registered = client.post("/api/v1/auth/registro", json=REGISTER).json()
    token = registered["confirmation_url"].split("token=")[1]
    assert client.get(f"/api/v1/auth/confirmar/{token}").status_code == 200
    second = client.get(f"/api/v1/auth/confirmar/{token}")
    assert second.status_code == 400
    assert "ya fue utilizado" in second.json()["detail"]
