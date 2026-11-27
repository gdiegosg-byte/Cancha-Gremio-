# 04 · Evidencias

## Verificación posterior al refactor por capas

Tras incorporar `be/app/repositories/` y los servicios por caso de uso se ejecutó, desde `be`:

```bash
./.venv/Scripts/python.exe -m pytest -q app/tests
./.venv/Scripts/python.exe -m ruff check app
```

Resultados: `63 passed` y `All checks passed!`. Las respuestas HTTP registradas más abajo pertenecen a la línea base y siguen siendo el contrato verificado: `400` para estado inválido, `409` para solape, `201` para creación y auditoría registrada.

## Versión auditada

```text
$ git log -1 --format='%H %s'
6c9f5021f65e0e5dc77eaefe6782b62c5577731a docs: agregar presentación HTML del proyecto
```

Antes de crear estos documentos:

```text
$ git status --short
```

Sin salida: árbol de trabajo limpio. Después de crear esta entrega:

```text
?? docs/
```

Los archivos de esta carpeta están sin commitear porque no se solicitó commit.

## Extracción de la guía

```bash
"C:\Program Files\Git\mingw64\bin\pdftotext.exe" -layout -enc UTF-8 \
  "C:\Users\diego\Downloads\Actividad_Arquitectura_Parte_I_Fases_1_y_2 (1).pdf" \
  "C:\Users\diego\AppData\Local\Temp\opencode\arquitectura_gui.txt"
```

La guía confirma la ruta obligatoria `docs/arquitectura/modulo-1/` y los cuatro archivos entregados aquí.

## Verificación de las operaciones

Mecanismo: `TestClient` de FastAPI con SQLite en memoria. Se usa `Base.metadata.create_all()` y `app.dependency_overrides` para `get_db` y `get_current_user`; la configuración real de producción sigue siendo PostgreSQL (`be/app/database.py:10-14`).

Comando ejecutado desde `be`:

```bash
./.venv/Scripts/python.exe "C:\Users\diego\AppData\Local\Temp\opencode\verificar_operaciones.py"
```

### Solicitudes y respuestas observadas

```text
GET /api/v1/reservations -> 200 []
POST /api/v1/reservations -> 201 {'id': 1, 'field_id': 1, 'client_name': 'Juan Garcia', 'client_email': 'juan@example.com', 'client_phone': '3001234567', 'start_time': '2026-11-25T10:00:00', 'end_time': '2026-11-25T11:00:00', 'total_price': 50000.0, 'status': 'pending', 'payment_status': 'partial'}
GET despues de crear -> 200 [{'id': 1, 'field_id': 1, 'client_name': 'Juan Garcia', 'client_email': 'juan@example.com', 'client_phone': '3001234567', 'start_time': '2026-11-25T10:00:00', 'end_time': '2026-11-25T11:00:00', 'total_price': 50000.0, 'status': 'pending', 'payment_status': 'partial'}]
GET estado=invalido -> 400 {'detail': 'Estado inválido: invalido'}
POST duplicado -> 409 {'detail': 'La cancha ya está reservada en ese horario (reserva #1)'}
filas en reservations -> 1
filas en audit_logs -> 1
```

La consola Windows mostró reemplazos de codificación en algunos acentos; los mensajes anteriores se transcriben con acentos correctos.

### Script usado

Guardado fuera del repo en `C:\Users\diego\AppData\Local\Temp\opencode\verificar_operaciones.py`.

```python
import sys

sys.path.insert(0, r"C:\Users\diego\OneDrive\Escritorio\canchas gremio\Cancha Gremio reac\be")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.field import Field
from app.models.audit_log import AuditLog
from app.models.reservation import Reservation

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

seed = TestingSessionLocal()
field = Field(
    name="Cancha Premium",
    price_per_hour=50000,
    surface_type="SYNTHETIC",
    capacity=10,
    available_hour_start="06:00",
    available_hour_end="22:00",
    is_active=True,
)
seed.add(field)
user = User(
    name="Admin",
    email="admin@canchagremio.com",
    phone="3001111111",
    password="hash",
    role="ADMIN",
    is_active=True,
    is_verified=True,
    session_version=0,
)
seed.add(user)
seed.commit()
seed.refresh(field)
seed.refresh(user)
seed.close()


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return user


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)
headers = {"Authorization": "Bearer token-verificacion"}

get_before = client.get("/api/v1/reservations", headers=headers)
print("GET /api/v1/reservations ->", get_before.status_code, get_before.json())

payload = {
    "field_id": field.id,
    "client_name": "Juan Garcia",
    "client_email": "juan@example.com",
    "client_phone": "3001234567",
    "start_time": "2026-11-25T10:00:00",
    "end_time": "2026-11-25T11:00:00",
    "payment_status": "partial",
}
post = client.post("/api/v1/reservations", json=payload, headers=headers)
print("POST /api/v1/reservations ->", post.status_code, post.json())

get_after = client.get("/api/v1/reservations", headers=headers)
print("GET despues de crear ->", get_after.status_code, get_after.json())

get_bad = client.get("/api/v1/reservations?estado=invalido", headers=headers)
print("GET estado=invalido ->", get_bad.status_code, get_bad.json())

post_conflict = client.post("/api/v1/reservations", json=payload, headers=headers)
print("POST duplicado ->", post_conflict.status_code, post_conflict.json())

check = TestingSessionLocal()
print("filas en reservations ->", check.query(Reservation).count())
print("filas en audit_logs ->", check.query(AuditLog).count())
check.close()
```

## Verificación complementaria

Backend importable:

```bash
./.venv/Scripts/python.exe -c "from app.main import app; print('backend OK')"
```

Frontend compilable; `dist` se eliminó después de comprobar para no dejar artefactos:

```bash
npm --prefix fe run build && rm -rf fe/dist
```

Salida relevante:

```text
> tsc && vite build
✓ 2378 modules transformed.
✓ built in 12.06s
```

## Capturas

No se generaron capturas de pantalla. La evidencia ejecutable conservada es la salida de consola mostrada arriba; las capturas quedan **por verificar** si la rúbrica las exige explícitamente.

## Sustentación individual

Equipo: Cancha Gremio

Integrantes: Diego Palencia, Julián Avilez, Erik Crespo

| Integrante | Tramo que debe explicar | Punto de partida |
|---|---|---|
| Diego Palencia | Operación de consulta: `/reservas` → `loadAll()` → `getAll()` → `get_reservations()` → filtros → ORM → JSON. | `01-funcionalidades.md`, columna CONSULTA; `02-inventario-componentes.md`, tabla de consulta. |
| Julián Avilez | Operación de escritura: formulario → `handleCreateReserva()` → `create_reservation()` → `_build_reservation()` → reglas → commit y auditoría. | `01-funcionalidades.md`, columna ESCRITURA; `02-inventario-componentes.md`, tabla de escritura. |
| Erik Crespo | Clasificación de responsabilidades y evidencias: router/controlador, middleware, dominio, persistencia, commit auditado y salida de `TestClient`. | `03-matriz-responsabilidades.md`; esta sección de evidencias. |

## Preguntas probables

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Por qué esas dos operaciones? | La consulta no altera estado; la escritura deja efecto persistente verificable en `reservations` y `audit_logs`. | `01-funcionalidades.md` |
| ¿Qué actor ejecuta cada una? | Usuario autenticado (`CLIENT` o `ADMIN`) con token Bearer; en UI por `/reservas`. | `App.tsx:48-50`; `dependencies.py:22-32` |
| ¿Dónde está el controlador? | En la misma función decorada de FastAPI; la guía acepta router + controlador en un mismo archivo. | `reservations.py:105`, `184`; guía página 2 |
| ¿Qué responsabilidades estaban mezcladas en la línea base? | Vista previa de conflictos en UI, consultas/commit en el router y reglas de negocio fuera de dominio/service. | `03-matriz-responsabilidades.md` |
| ¿Por qué se separaron capas después? | La línea base quedó documentada primero; después se aplicó el refactor a monolito modular por capas sin cambiar el contrato HTTP. | `03-matriz-responsabilidades.md` |
| ¿Qué pasa si la cancha no existe? | `404 Cancha no encontrada`. | `reservations.py:54-58` |
| ¿Qué pasa si el horario solapa o hay evento? | `409` con detalle de la reserva o del evento bloqueante. | `reservations.py:27-51` |
| ¿Qué tablas se consultan y cuáles se modifican? | Consulta: `reservations`, `users`, `token_blacklist`. Escritura además consulta `fields`, `events`, `pricing_tiers` y modifica `reservations` + `audit_logs`. | `01-funcionalidades.md` |
| ¿Qué commit se auditó? | `6c9f5021f65e0e5dc77eaefe6782b62c5577731a`. | Encabezado de este archivo |
| ¿Se cambió código funcional? | No; solo se agregaron estos cuatro documentos. | `git status --short` → `?? docs/` |

## Lista de control de la guía

- [x] Se ejecutaron o verificaron ambas operaciones.
- [x] La matriz funcional está completa y no contiene suposiciones sin marcar.
- [x] Se localizaron archivos, funciones y dependencias relevantes.
- [x] La matriz distingue «correcta», «mezclada», «no aplica» y «por verificar».
- [x] Cada integrante puede explicar al menos un tramo del recorrido real: tramos asignados arriba.
- [x] Se registró el commit examinado; no se cambió el código funcional.
