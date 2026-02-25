# ⚽ Cancha Gremio — Sistema de Reservas

Frontend React + TypeScript + Vite para gestión de cancha sintética.

## 🚀 Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

## 📁 Estructura

```
src/
├── api/           # Llamadas al backend (axios)
│   ├── client.ts  # Instancia axios + interceptors
│   ├── auth.ts    # Auth & usuarios
│   ├── reservas.ts
│   └── eventos.ts
├── components/    # Componentes reutilizables
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── StatCard.tsx
│   └── ProtectedRoute.tsx
├── context/       # Estado global
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
├── hooks/         # Custom hooks
│   └── index.ts   # useAsync, useDebounce, useLocalStorage, useClickOutside
├── pages/         # Vistas principales
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ReservasPage.tsx
│   ├── ClientesPage.tsx
│   ├── EventosPage.tsx
│   ├── MantenimientoPage.tsx
│   └── ReportesPage.tsx
├── types/
│   └── index.ts   # Interfaces TypeScript
├── App.tsx        # Rutas
└── main.tsx       # Entry point
```

## 🔐 Roles

| Rol     | Acceso |
|---------|--------|
| admin   | Dashboard, Reservas, Clientes, Eventos, Mantenimiento, Reportes |
| cliente | Reservas, Eventos |

## 🎨 Stack

- React 18 + TypeScript
- React Router v6
- Axios (API client)
- Lucide React (icons)
- date-fns (fechas)
- Vite (bundler)

## 🔌 Conectar al Backend

1. Configura `VITE_API_URL` en `.env`
2. Reemplaza los datos mock en las páginas con llamadas reales a la API
3. El cliente Axios ya maneja tokens JWT automáticamente

## 📄 Demo Login

- **Admin:** `admin@canchagremio.com` / cualquier contraseña
- **Cliente:** cualquier otro email
