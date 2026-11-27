# 01 · Funcionalidades

Proyecto / equipo: Cancha Gremio

Integrantes: Diego Palencia, Julián Avilez, Erik Crespo

Repositorio: `https://github.com/gdiegosg-byte/Cancha-Gremio-.git`

Commit analizado: `6c9f5021f65e0e5dc77eaefe6782b62c5577731a` (`docs: agregar presentación HTML del proyecto`)

Alcance: Fase 1 y Fase 2 exclusivamente. No se refactorizó código ni se propuso arquitectura objetivo.

## Operaciones seleccionadas

| Tipo | Operación | Ruta | Función de entrada |
|---|---|---|---|
| Consulta | Listar reservas | `GET /api/v1/reservations` | `be/app/routers/reservations.py:108` · `get_reservations()` |
| Escritura | Crear reserva | `POST /api/v1/reservations` | `be/app/routers/reservations.py:187` · `create_reservation()` |

Estado de verificación: ambas operaciones se ejecutaron con `fastapi.testclient.TestClient` sobre una BD SQLite en memoria. La ejecución manual en navegador quedó **por verificar**; la interfaz se revisó por código.

## Matriz funcional

| Elemento | Consulta · Listar reservas | Escritura · Crear reserva |
|---|---|---|
| Nombre de la funcionalidad | Listar reservas con filtros opcionales. | Crear una reserva validando cancha, horario, solapamientos y precio. |
| Actor que la ejecuta | Usuario autenticado (`CLIENT` o `ADMIN`). En la UI entra por `/reservas`; en API envía `Authorization: Bearer <token>`. | Usuario autenticado (`CLIENT` o `ADMIN`). En la UI completa el modal de nueva reserva; en API envía `Authorization: Bearer <token>`. |
| Resultado esperado | JSON con reservas ordenadas por `start_time` descendente. No altera estado. | JSON de la reserva creada con `id`, `total_price`, `status` y `payment_status`. Efecto persistente en `reservations` y `audit_logs`. |
| Componente que recibe la solicitud | `APIRouter` de FastAPI en `be/app/routers/reservations.py:19`, decorador `@router.get("")` en `:105`. En frontend: `reservasApi.getAll()` en `fe/src/api/reservas.ts:38-39`. | `APIRouter` de FastAPI en `be/app/routers/reservations.py:19`, decorador `@router.post("")` en `:184`. En frontend: `reservasApi.create()` en `fe/src/api/reservas.ts:42-43`. |
| Ruta, función o evento inicial | `GET /api/v1/reservations` → `get_reservations()` (`reservations.py:108-138`). Carga UI: `ReservasPage.tsx:272-306` → `loadAll()` → `reservasApi.getAll()`. | `POST /api/v1/reservations` → `create_reservation()` (`reservations.py:187-200`). Carga UI: `ReservasPage.tsx:424-466` → `handleCreateReserva()` → `reservasApi.create()`. |
| Datos de entrada | Query params: `estado` (`pending`/`confirmed`/`cancelled`), `cancha` (int), `desde` (datetime), `hasta` (datetime), `q` (texto). Header `Authorization`. Definidos en `reservations.py:109-115`. | Body `ReservationCreate` (`schemas/reservation.py:12-20`): `field_id > 0`, `client_name` 3–120, `client_email` válido, `client_phone` 7–20, `start_time`, `end_time`, `status` opcional (`pending`/`confirmed`), `payment_status` opcional (`pending`/`partial`/`paid`). Header `Authorization`. |
| Datos de salida | `200` + `list[ReservationResponse]` (`schemas/reservation.py:40-53`): `id`, `field_id`, datos de cliente, `start_time`, `end_time`, `total_price`, `status`, `payment_status`. | `201` + `ReservationResponse`. Ejemplo verificado: `id=1`, `field_id=1`, `total_price=50000.0`, `status="pending"`, `payment_status="partial"`. |
| Tablas o fuentes consultadas | `reservations` (`models/reservation.py:10`); `token_blacklist` y `users` por autenticación (`dependencies.py:22-32`, `security.py:47-58`). Sin APIs externas. | `fields` (`_check_field_availability`, `:54-58`), `reservations` y `events` (`check_conflicts`, `:27-51`), `pricing_tiers` (`pricing_service.py:25-39`), `users` y `token_blacklist` por autenticación. Festivos se calculan localmente en `services/festivos.py:29-56`; sin APIs externas. |
| Tablas o recursos modificados | Ninguna. | `reservations`: `db.add`, `db.commit`, `db.refresh` (`:189-191`). `audit_logs`: `write_audit()` (`services/audit.py:9-19`) registra acción `CREATE` con `performed_by=user.email` (`:192-199`). No se setea `Reservation.user_id`; queda `NULL` porque es nullable (`models/reservation.py:17`). |
| Reglas de negocio | `estado` debe estar en el conjunto permitido (`:119-122`). Búsqueda `q` aplica `ilike` sobre nombre, email y teléfono (`:129-135`). Orden por fecha de inicio descendente (`:137`). | Cancha debe existir (`:54-58`); `end_time > start_time` y reserva dentro del horario operativo, con soporte de medianoche (`:61-82`); no solape con reservas `pending`/`confirmed` ni con eventos (`:27-51`); precio = tarifa resuelta × horas, mínimo 1 hora (`:90-99`); estados por defecto `pending` (`:100-101`). |
| Errores posibles | `400` estado inválido (`:121`); `401` token ausente/inválido/revocado/sesión cerrada (`extract_bearer` y `get_current_user`); `422` query con formato inválido; `500` manejador genérico (`main.py:77-83`). | `422` body inválido (Pydantic); `404` cancha no encontrada (`:57`); `400` rango de fechas u horario operativo (`:63`, `:78-82`); `409` solape con reserva o evento (`:39-51`), o violación de integridad (`main.py:68-74`); `401` autenticación; `500` manejador genérico. |

## Notas de clasificación

- Validación sintáctica: Pydantic en `schemas/reservation.py:12-20` y `Query` en `reservations.py:109-115`.
- Regla funcional: pertenencia de `estado`, existencia de cancha, ventana operativa, solapamiento y cálculo de tarifa.
- Error técnico: `IntegrityError` traducido a `409` en `main.py:68-74`; errores no controlados a `500` en `main.py:77-83`.
- No se identificaron llamadas a proveedores externos, procesos en segundo plano ni eventos asíncronos en estas dos operaciones.
- Estado actual: las consultas ya están separadas en `be/app/repositories/` y las reglas funcionales en `be/app/services/`. Las referencias de líneas de esta tabla corresponden a la línea base documentada.
