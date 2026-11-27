# 03 · Matriz de responsabilidades

Línea base: `6c9f5021f65e0e5dc77eaefe6782b62c5577731a`.
Estado actual: monolito modular por capas; routers, servicios y repositorios tienen responsabilidades separadas.

| Componente | Archivo / función | Responsabilidad real | Evaluación | Justificación |
|---|---|---|---|---|
| Interfaz | `fe/src/pages/ReservasPage.tsx` · `loadAll()`, `handleCreateReserva()` | Carga la lista, muestra reservas, captura el formulario y muestra toasts. | **Mezclada** | Además de presentar, calcula una previsualización de conflictos (`getConflict`, `canchasDisponibles`). La decisión persistente ya no está en la UI. |
| Router / Entrada HTTP | `be/app/routers/*.py` | Asocia rutas, declara `response_model`, `status_code`, query/body y dependencias. | **Correcta** | Los routers solo adaptan HTTP y delegan a `services/`. Ya no contienen `db.query`, commits ni reglas de negocio. |
| Middleware | `be/app/main.py`; `fe/src/api/client.ts` | Cabeceras de seguridad, CORS, redirect HTTPS, bearer y refresh. | **Correcta** | Controles transversales de transporte; no orquestan casos de uso. |
| Controller | `be/app/routers/reservations.py` · `create_reservation()`, `get_reservations()` | Convierte request en llamada de aplicación y response en JSON. | **Correcta** | La coordinación está en `ReservationService`; el router no decide persistencia ni reglas. |
| Service / Use Case | `be/app/services/reservation_service.py`, `field_service.py`, `event_service.py`, `maintenance_service.py`, `client_service.py`, `dashboard_service.py`, `pricing_service.py`, `auth_service.py` | Coordinan reglas de negocio, validaciones funcionales y excepciones de dominio. | **Correcta** | Reciben `Session` por inyección y delegan el SQL a repositorios. No lanzan `HTTPException`. |
| Errores de dominio | `be/app/services/exceptions.py`, `be/app/main.py` | Definen `NotFoundError`, `ConflictError`, `ValidationError`, `ForbiddenError`, `UnauthorizedError`, `LockedError` y su mapeo HTTP. | **Correcta** | `domain_error_handler()` conserva los códigos y mensajes esperados por el frontend. |
| Repository / Adapter | `be/app/repositories/reservation_repository.py`, `field_repository.py`, `event_repository.py`, `user_repository.py`, `pricing_repository.py`, `audit_repository.py`, `auth_token_repository.py`, `token_blacklist_repository.py`, `dashboard_repository.py` | Consultan y escriben en SQLAlchemy con la sesión inyectada. | **Correcta** | Capa separada; los servicios ya no construyen consultas ORM directas. |
| Dominio | `be/app/models/reservation.py`, `field.py`, `event.py`, `user.py`, `pricing_tier.py`, `audit_log.py`, `auth_token.py`, `token_blacklist.py` | Representan tablas, columnas, relaciones y constraints. | **Correcta** | Sin decisiones HTTP; las reglas de aplicación viven en `services/`. |
| Base de datos | `reservations`, `fields`, `events`, `pricing_tiers`, `audit_logs`, `token_blacklist`, `auth_tokens`, `users` | Almacena datos y aplica integridad. | **Correcta** | Los constraints complementan, no sustituyen, las reglas de aplicación. |
| Esquemas / validación | `be/app/schemas/*.py` | Valida sintaxis del body y define DTO de entrada/salida. | **Correcta** | Pydantic delimita el contrato; las reglas funcionales están en servicios. |
| Autenticación / autorización | `be/app/dependencies.py`, `be/app/services/security.py`, `AuthTokenRepository`, `TokenBlacklistRepository` | Extrae Bearer, valida JWT, blacklist, usuario activo, `session_version` y roles. | **Correcta** | Responsabilidad transversal fuera de los casos de uso. `security.py` solo emite/valida JWT y correo simulado; la persistencia de tokens está en repositorios. |
| Proveedores externos / colas | Sin archivo | No participan en los recorridos verificados. | **No aplica** | `festivos.py` calcula fechas localmente; no hay workers. |
| Ejecución manual en navegador | `fe/src/pages/ReservasPage.tsx` | La interfaz fue localizada por código. | **Por verificar** | La evidencia ejecutable cubre la API con `TestClient` y 63 pruebas backend. |

## Cambio aplicado

- Se incorporó `be/app/repositories/` para todos los módulos: reservas, canchas, eventos, mantenimientos, clientes, dashboard, tarifas y autenticación.
- Se completaron los servicios por caso de uso; los routers quedaron delgados.
- `auth_service.py` dejó de abrir `SessionLocal()` internamente y ahora usa la sesión inyectada por `get_db`.
- `security.py` conserva JWT/hash/correo; blacklist y tokens de enlace se persisten mediante repositorios.
- La línea base documentada en este directorio se mantiene como contexto histórico; esta matriz describe el estado posterior al refactor.
