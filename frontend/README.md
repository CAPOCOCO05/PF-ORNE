# ORNE — Frontend (app móvil)

App móvil de ORNE hecha con Expo + React Native + Expo Router. Pide los datos a la
API de ORNE (ver [`../backend`](../backend/README.md)); solo usa Supabase directamente
para iniciar sesión.

## Requisitos
- Node.js LTS
- App **Expo Go** en el celular, o un emulador Android / simulador iOS
- La API corriendo (`cd backend && npm run dev`), en la misma red Wi-Fi que el celular

## Instalación

```bash
cd frontend
npm ci                  # instala exactamente lo del package-lock.json
cp .env.example .env    # y llena los valores de Supabase y la URL de la API
npm start               # expo start (si cambias el .env: npx expo start -c)
```

> `.npmrc` activa `legacy-peer-deps` para evitar un conflicto de peer
> dependencies (`react-dom`) que trae Expo.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de la API, con la IP de la PC: `http://<IP-de-tu-PC>:3000` (no `localhost`) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (inicio de sesión) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (anon) del proyecto (inicio de sesión) |

El archivo `.env` no se sube a git.

## Estructura

```
frontend/
├── app/                # pantallas y rutas (Expo Router)
│   ├── _layout.tsx     # AuthProvider global
│   ├── index.tsx       # redirección según sesión
│   └── (auth)/         # login, registro
├── src/
│   ├── services/       # peticiones a la API (api.ts) y sesión con Supabase Auth
│   ├── context/        # estado global (AuthContext, PedidoContext)
│   ├── types/          # tipos TypeScript
│   └── constants/      # catálogos locales (sabores, precios)
└── assets/             # imágenes (íconos, sabores)
```

Regla de capas: `app/` → `hooks/` / `context/` → `services/` → API. Las pantallas y
contextos no hacen peticiones ni importan `supabase` directamente.
