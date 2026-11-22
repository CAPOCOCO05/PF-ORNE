# ORNE — Personalización y pedido de pastelería

App móvil donde el cliente arma su pastel paso a paso, programa la entrega y
confirma su pedido con un folio de seguimiento.

## Estructura del repositorio

```
orne/
├── frontend/   # App móvil (Expo + React Native)      → frontend/README.md
├── backend/    # API en capas (Express) + migraciones Supabase → backend/README.md
└── specs/      # Especificación del proyecto y features
```

El frontend y el backend están separados. La app pide los datos a la API de
`backend/` (`EXPO_PUBLIC_API_URL`) y la API es la que consulta Supabase. La app
solo usa Supabase directamente para iniciar sesión (Supabase Auth).

## Inicio rápido
1. Monta el backend y arranca la API: [backend/README.md](backend/README.md).
2. Corre la app: [frontend/README.md](frontend/README.md).

## Especificación
- [Proyecto](specs/00-project.md)
- [Navegación](specs/01-navigation.md)
- [Modelo de datos](specs/02-data-model.md)
- Features: [`specs/features/`](specs/features/)
