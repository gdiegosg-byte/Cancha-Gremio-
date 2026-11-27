# 02 · Inventario de componentes

Línea base: `6c9f5021f65e0e5dc77eaefe6782b62c5577731a`.
Estado actual: monolito modular por capas con `be/app/services/` y `be/app/repositories/`.

## Recorrido resumido

**Consulta**

`/reservas` → `ProtectedRoute` → `ReservasPage.loadAll()` → `reservasApi.getAll()` → interceptor Axios → `GET /api/v1/reservations` → `get_reservations()` → `ReservationService.list()` → `ReservationRepository.list()` → `ReservationResponse`.

**Escritura**

Modal de reserva → `handleCreateReserva()` → `reservasApi.create()` → interceptor Axios → `POST /api/v1/reservations` → `create_reservation()` → `ReservationService.create()` → `_check_field_availability()` / `_validate_window()` / `check_conflicts()` / `PricingService.get_hour_price()` → `ReservationRepository.create()` → `AuditRepository.write()` → `ReservationResponse`.

## Capas del monolito

| Capa | Directorio | Responsabilidad |
|---|---|---|
| HTTP | `be/app/routers/` | Decoradores, Pydantic, `Depends`, códigos de estado. Sin `db.query` ni reglas de negocio. |
| Aplicación | `be/app/services/` | Casos de uso, validaciones funcionales y excepciones de dominio. |
| Persistencia | `be/app/repositories/` | Consultas y escrituras SQLAlchemy con `Session` inyectada. |
| Dominio | `be/app/models/` | Tablas ORM, columnas, relaciones y constraints. |
| Infraestructura | `be/app/database.py`, `be/app/dependencies.py` | Sesión por request, JWT, blacklist y roles. |

## Instrumento A · Trazabilidad de la consulta

| # | Paso | Archivo / función | Entrada / responsabilidad | Dependencia | Resultado |
|---|---|---|---|---|---|
| 1 | Ruta protegida | `fe/src/App.tsx` · `/reservas` | Renderiza `ReservasPage` con sesión activa. | `<ProtectedRoute>` | Página disponible. |
| 2 | Carga de pantalla | `fe/src/pages/ReservasPage.tsx` · `loadAll()` | Pide reservas, canchas y eventos. | `Promise.all([...])` | Estado local cargado. |
| 3 | Cliente API | `fe/src/api/reservas.ts` · `getAll()` | Compone `GET /api/v1/reservations`. | `api.get` | `Promise<AxiosResponse>`. |
| 4 | Transporte | `fe/src/api/client.ts` | Adjunta Bearer y renueva en `401`. | Interceptores Axios | Request autenticado. |
| 5 | Entrada HTTP | `be/app/routers/reservations.py` · `get_reservations()` | Recibe filtros y dependencias. | `Depends(get_db)`, `Depends(get_current_user)` | Llama al servicio. |
| 6 | Autenticación | `be/app/dependencies.py` · `get_current_user()` | Valida JWT, blacklist, usuario activo y versión de sesión. | `TokenBlacklistRepository`, `UserRepository` | `User` o `401`. |
| 7 | caso de uso | `be/app/services/reservation_service.py` · `list()` | Valida `estado` y ordena por fecha descendente. | `ReservationRepository.list()` | Entidades ORM. |
| 8 | Persistencia | `be/app/repositories/reservation_repository.py` · `list()` | Aplica filtros `estado`, `cancha`, `desde`, `hasta`, `q`. | SQLAlchemy `Session` | Consulta ejecutada. |
| 9 | Dominio | `be/app/models/reservation.py` | Mapea `reservations` y sus constraints. | ORM | Filas como objetos. |
| 10 | Respuesta | `be/app/schemas/reservation.py` · `ReservationResponse` | Define el JSON de salida. | `response_model` | `200` + lista. |

## Instrumento A · Trazabilidad de la escritura

| # | Paso | Archivo / función | Entrada / responsabilidad | Dependencia | Resultado |
|---|---|---|---|---|---|
| 1 | Formulario | `fe/src/pages/ReservasPage.tsx` · `handleCreateReserva()` | Captura cancha, cliente, fecha/hora y pago. | `reservasApi.create()` | Intento de creación. |
| 2 | Cliente HTTP | `fe/src/api/reservas.ts`, `fe/src/api/client.ts` | `POST` autenticado con refresh en `401`. | Axios | Request al backend. |
| 3 | Entrada HTTP | `be/app/routers/reservations.py` · `create_reservation()` | Recibe `ReservationCreate`, sesión y usuario. | `ReservationService(db)` | Delega sin lógica de negocio. |
| 4 | Contrato | `be/app/schemas/reservation.py` · `ReservationCreate` | Valida longitudes, email, rangos y enums. | Pydantic | Body válido o `422`. |
| 5 | Orquestación | `be/app/services/reservation_service.py` · `create()`, `_build_reservation()` | Verifica cancha, ventana, conflictos y precio. | `FieldRepository`, `EventRepository`, `PricingService` | Datos listos para persistir. |
| 6 | Cancha | `be/app/repositories/field_repository.py` · `get()` | Busca `Field` por id. | SQLAlchemy | `Field` o `NotFoundError`. |
| 7 | Ventana | `be/app/services/reservation_service.py` · `_validate_window()` | Compara horarios con el operativo de la cancha. | `_to_minutes()` | Pasa o `ValidationError`. |
| 8 | Conflictos | `be/app/repositories/reservation_repository.py`, `event_repository.py` | Detecta solapes con reservas activas y eventos. | `has_overlap()` | Pasa o `ConflictError`. |
| 9 | Precio | `be/app/services/pricing_service.py`, `pricing_repository.py` | Clasifica día, busca franja y calcula precio por hora. | `es_festivo()` | `float` + franja opcional. |
| 10 | Escritura | `be/app/repositories/reservation_repository.py` · `create()` | Persiste y refresca la reserva. | `db.add/commit/refresh` | Fila en `reservations`. |
| 11 | Auditoría | `be/app/repositories/audit_repository.py` · `write()` | Registra tabla, id, acción y actor. | `db.add(AuditLog)` | Fila en `audit_logs`. |
| 12 | Mapeo de errores | `be/app/main.py` · `domain_error_handler()` | Convierte excepciones de dominio a HTTP. | `JSONResponse` | `400/401/403/404/409/423` con `detail`. |
| 13 | Respuesta y UI | `schemas/reservation.py`, `ReservasPage.tsx` | Serializa salida; la UI recarga la lista. | `response_model` | `201` + JSON. |

## Repositorios disponibles

`AuditRepository`, `AuthTokenRepository`, `DashboardRepository`, `EventRepository`, `FieldRepository`, `PricingRepository`, `ReservationRepository`, `TokenBlacklistRepository`, `UserRepository`.

## No aplica / por verificar

- Proveedores externos: **No aplica**. Festivos se calculan en código local (`festivos.py`).
- Procesos en segundo plano o colas: **No aplica**.
- Ejecución manual desde navegador: **Por verificar**; la evidencia ejecutable cubre la API con `TestClient`.
