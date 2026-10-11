# ORNE — Personalización y pedido de pastelería

App móvil donde el cliente arma su pastel paso a paso, programa la entrega y
confirma su pedido con un folio de seguimiento.

## Estructura del repositorio

```
orne/
├── frontend/   # App móvil (Expo + React Native)      → frontend/README.md
├── backend/    # Esquema Supabase (migraciones SQL)   → backend/README.md
└── specs/      # Especificación del proyecto y features
```

El frontend y el backend están separados: el frontend solo conoce el backend a
través de las variables `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Inicio rápido
1. Monta el backend: [backend/README.md](backend/README.md).
2. Corre la app: [frontend/README.md](frontend/README.md).

## Especificación
- [Proyecto](specs/00-project.md)
- [Navegación](specs/01-navigation.md)
- [Modelo de datos](specs/02-data-model.md)
- Features: [`specs/features/`](specs/features/)
