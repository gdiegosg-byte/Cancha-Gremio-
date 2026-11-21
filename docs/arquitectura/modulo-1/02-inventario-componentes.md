# 02 · Inventario de componentes

Commit analizado: `6c9f5021f65e0e5dc77eaefe6782b62c5577731a`

No se modificó código funcional; este archivo solo reconstruye el recorrido real.

## Recorrido resumido

**Consulta**

`/reservas` → `ProtectedRoute` → `ReservasPage.loadAll()` → `reservasApi.getAll()` → interceptor Axios → `GET /api/v1/reservations` → `get_reservations()` → `get_db()` + `get_current_user()` → `db.query(Reservation)` → `ReservationResponse`.

**Escritura**

Modal de reserva → `handleCreateReserva()` → `reservasApi.create()` → interceptor Axios → `POST /api/v1/reservations` → `create_reservation()` → `_build_reservation()` → `_check_field_availability()` + `_validate_window()` + `check_conflicts()` + `get_hour_price()` → `db.commit()` → `write_audit()` → `ReservationResponse`.

## Instrumento A · Trazabilidad de la consulta

| # | Paso | Archivo y función | Entrada / responsabilidad real | Dependencia / llamada | Resultado | Evidencia (líneas) |
|---|---|---|---|---|---|---|
| 1 | Ruta protegida | `fe/src/App.tsx` · ruta `/reservas` | Renderiza `ReservasPage` solo si hay sesión. | `<ProtectedRoute><ReservasPage /></ProtectedRoute>` | Página disponible para usuario autenticado. | `App.tsx:48-50`; `ProtectedRoute.tsx:15` |
| 2 | Carga de pantalla | `fe/src/pages/ReservasPage.tsx` · `loadAll()` | Al montar, pide reservas, canchas y eventos; refresca al volver al tab. | `Promise.all([reservasApi.getAll(), fieldsApi.getAll(), eventosApi.getAll()])` | Estado local `reservas`, `campos`, `eventos`. | `ReservasPage.tsx:272-306` |
| 3 | Cliente API | `fe/src/api/reservas.ts` · `getAll()` | Convierte la acción de UI en `GET /api/v1/reservations`. | `api.get<ReservationResponse[]>(...)` | `Promise<AxiosResponse>`. | `reservas.ts:37-39` |
| 4 | Transporte HTTP | `fe/src/api/client.ts` · interceptores | Adjunta `Bearer <cg_token>`; si hay `401`, renueva con refresh y reintenta. | `api.interceptors.request` / `api.interceptors.response` | Request autenticado; logout local si falla refresh. | `client.ts:45-50`, `52-87`; `reservas.ts:1` |
| 5 | Registro del router | `be/app/main.py` · `include_router(reservations.router)` | Expone el router sin prefijo adicional porque el `APIRouter` ya trae `/api/v1/reservations`. | `app.include_router(reservations.router)` | Rutas activas en la app FastAPI. | `main.py:5`, `88`; `reservations.py:19` |
| 6 | Entrada HTTP | `be/app/routers/reservations.py` · `get_reservations()` | Recibe query params y delega autenticación/sesión por dependencias. | `@router.get("")`; `Depends(get_db)`; `Depends(get_current_user)` | Ejecuta la consulta. | `reservations.py:105-116` |
| 7 | Autenticación | `be/app/dependencies.py` · `extract_bearer()`, `get_current_user()` | Extrae el token, valida JWT, blacklist, usuario activo y `session_version`. | `decode_token`, `is_blacklisted`, `db.query(User)` | `User` autenticado o `401`. | `dependencies.py:13-32`; `security.py:47-58` |
| 8 | Filtrado | `be/app/routers/reservations.py` · `get_reservations()` | Aplica filtros `estado`, `cancha`, `desde`, `hasta`, `q` y orden. | `db.query(Reservation).filter(...).order_by(...)` | Consulta SQLAlchemy construida. | `reservations.py:117-137` |
| 9 | Persistencia | `be/app/database.py` · `get_db()` | Entrega una sesión por request y la cierra al final. | `SessionLocal()` sobre `engine` | Sesión SQLAlchemy. | `database.py:10-25` |
| 10 | Dominio / ORM | `be/app/models/reservation.py` · `Reservation` | Mapea la tabla `reservations` con constraints de `status` y `payment_status`. | `Base`, columnas ORM | Filas convertidas a objetos. | `models/reservation.py:9-28` |
| 11 | Respuesta | `be/app/schemas/reservation.py` · `ReservationResponse` | Define la forma del JSON de salida. | `response_model=list[ReservationResponse]` | `200` + lista JSON. | `schemas/reservation.py:40-53`; `reservations.py:105` |

## Instrumento A · Trazabilidad de la escritura

| # | Paso | Archivo y función | Entrada / responsabilidad real | Dependencia / llamada | Resultado | Evidencia (líneas) |
|---|---|---|---|---|---|---|
| 1 | Ruta protegida | `fe/src/App.tsx` · ruta `/reservas` | Mismo punto de entrada que la consulta; rol `admin` no es obligatorio para esta ruta. | `<ProtectedRoute>` | Acceso para usuario autenticado. | `App.tsx:48-50` |
| 2 | Formulario | `fe/src/pages/ReservasPage.tsx` · `handleCreateReserva()` | Captura cancha, cliente, fecha/hora y `payment_status`; compone datetimes. | `setNewReserva`, `reservasApi.create({...})` | Intento de creación. | `ReservasPage.tsx:424-438` |
| 3 | Cliente API | `fe/src/api/reservas.ts` · `create()` | Convierte el formulario en `POST /api/v1/reservations`. | `api.post<ReservationResponse>(...)` | `Promise<AxiosResponse>`. | `reservas.ts:42-43` |
| 4 | Transporte HTTP | `fe/src/api/client.ts` · interceptores | Adjunta token y aplica refresh en `401`. | Igual que la consulta | Request autenticado. | `client.ts:45-87` |
| 5 | Entrada HTTP | `be/app/routers/reservations.py` · `create_reservation()` | Recibe `ReservationCreate`, sesión y usuario; coordina creación y auditoría. | `@router.post("", status_code=201)` | Reserva creada o excepción HTTP. | `reservations.py:184-200` |
| 6 | Contrato de entrada | `be/app/schemas/reservation.py` · `ReservationCreate` | Validación sintáctica de longitudes, email, rangos y enums. | Pydantic `Field`, `EmailStr`, `pattern` | Body válido o `422`. | `schemas/reservation.py:12-20` |
| 7 | Orquestación de reglas | `be/app/routers/reservations.py` · `_build_reservation()` | Verifica cancha, ventana, conflictos y arma el objeto ORM con precio y estados. | `_check_field_availability` → `_validate_window` → `check_conflicts` → `get_hour_price` | `Reservation` en memoria. | `reservations.py:85-102` |
| 8 | Cancha | `be/app/routers/reservations.py` · `_check_field_availability()` | Busca `Field` por id; evalúa existencia. | `db.query(Field)` | `Field` o `404`. | `reservations.py:54-58`; `models/field.py:9-25` |
| 9 | Ventana operativa | `be/app/routers/reservations.py` · `_validate_window()` | Compara minutos de inicio/fin contra `available_hour_start/end`, con cruce de medianoche. | `_to_minutes(field.available_hour_*)` | Pasa o `400`. | `reservations.py:22-24`, `61-82` |
| 10 | Conflictos | `be/app/routers/reservations.py` · `check_conflicts()` | Detecta solape con reservas activas y con eventos de la cancha. | `db.query(Reservation)` y `db.query(Event)` | Pasa o `409`. | `reservations.py:27-51`; `models/event.py:9-23` |
| 11 | Precio | `be/app/services/pricing_service.py` · `get_hour_price()` / `resolve_tier()` | Clasifica día, busca franja activa y devuelve precio por hora. | `es_festivo()` y `db.query(PricingTier)` | `float` + franja opcional. | `pricing_service.py:16-47`; `festivos.py:29-56`; `models/pricing_tier.py:8-24` |
| 12 | Escritura | `be/app/routers/reservations.py` · `create_reservation()` | Persiste la reserva y refresca el objeto. | `db.add`, `db.commit`, `db.refresh` | Fila en `reservations`. | `reservations.py:188-191` |
| 13 | Auditoría | `be/app/services/audit.py` · `write_audit()` | Registra tabla, id, acción `CREATE`, detalle y email del actor. | `db.add(AuditLog)` + `db.commit()` | Fila en `audit_logs`. | `audit.py:9-19`; `reservations.py:192-199`; `models/audit_log.py:9-18` |
| 14 | Persistencia | `be/app/database.py` · `get_db()` | Sesión por request, cerrada al finalizar. | `SessionLocal()` | Transacción confirmada. | `database.py:10-25` |
| 15 | Respuesta y UI | `be/app/schemas/reservation.py` · `ReservationResponse`; `fe/src/pages/ReservasPage.tsx` | Serializa salida; la UI muestra toast, recarga lista y resalta la fila creada. | `response_model`; `reservasApi.getAll()` | `201` + JSON; lista actualizada. | `schemas/reservation.py:40-53`; `reservations.py:184`; `ReservasPage.tsx:439-463` |

## Componentes de apoyo identificados

| Responsabilidad de apoyo | Archivo | Uso real en estas operaciones |
|---|---|---|
| Middleware HTTP | `be/app/main.py:34-65` | Cabeceras de seguridad, CORS y redirección HTTPS opcional. No orquesta ninguna de las dos operaciones. |
| Manejo de errores global | `be/app/main.py:68-83` | Traduce `IntegrityError` a `409` y errores no controlados a `500`. |
| Seguridad JWT | `be/app/services/security.py:47-64` | Decodifica access token, valida tipo y consulta blacklist. |
| Modelo de usuario | `be/app/models/user.py:9-27` | Fuente del `User` autenticado; `role`, `is_active` y `session_version` participan en la autorización. |
| Cliente HTTP | `fe/src/api/client.ts:8-14` | `baseURL` desde `VITE_API_URL`, `Content-Type: application/json` y timeout de 10s. |

## No aplica / por verificar

- Proveedores externos: **No aplica**. Festivos se calculan en código local (`festivos.py:29-56`).
- Procesos en segundo plano o colas: **No aplica**. No aparecen en los imports ni en los recorridos de ambas operaciones.
- Ejecución manual desde navegador: **Por verificar**. La capa UI fue inventariada por código; la ejecución verificada fue la API con `TestClient`.
