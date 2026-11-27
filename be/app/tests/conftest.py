import importlib

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.services import security

for model_name in (
    "audit_log",
    "auth_token",
    "event",
    "field",
    "pricing_tier",
    "reservation",
    "token_blacklist",
    "user",
):
    importlib.import_module(f"app.models.{model_name}")


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(engine, session_factory):
    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_user(session, email, password="Password1!", role="CLIENT", verified=True):
    new_user = User(
        name="Usuario Prueba",
        email=email,
        phone="3001234567",
        password=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
        role=role,
        is_active=True,
        is_verified=verified,
        session_version=0,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


def auth_headers(session, email="user@test.com", password="Password1!", role="CLIENT"):
    new_user = make_user(session, email, password, role)
    token, _ = security.encode_token(
        new_user.id,
        "access",
        30,
        extra={"ver": new_user.session_version or 0},
    )
    return {"Authorization": f"Bearer {token}"}, new_user
