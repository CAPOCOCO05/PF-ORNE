# ORNE — Frontend (app móvil)

App móvil de ORNE hecha con Expo + React Native + Expo Router. Se conecta al
backend en Supabase (ver [`../backend`](../backend/README.md)).

## Requisitos
- Node.js LTS
- App **Expo Go** en el celular, o un emulador Android / simulador iOS

## Instalación

```bash
cd frontend
npm ci                  # instala exactamente lo del package-lock.json
cp .env.example .env    # y llena los valores de Supabase
npm start               # expo start
```

> `.npmrc` activa `legacy-peer-deps` para evitar un conflicto de peer
> dependencies (`react-dom`) que trae Expo.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (anon) del proyecto |

El archivo `.env` no se sube a git.

## Estructura

```
frontend/
├── app/                # pantallas y rutas (Expo Router)
│   ├── _layout.tsx     # AuthProvider global
│   ├── index.tsx       # redirección según sesión
│   └── (auth)/         # login, registro
├── src/
│   ├── services/       # acceso a Supabase (única capa que lo importa)
│   ├── context/        # estado global (AuthContext, PedidoContext)
│   ├── types/          # tipos TypeScript
│   └── constants/      # catálogos locales (sabores, precios)
└── assets/             # imágenes (íconos, sabores)
```

Regla de capas: `app/` → `context/` → `services/` → Supabase. Las pantallas y
contextos no importan `supabase` directamente.
