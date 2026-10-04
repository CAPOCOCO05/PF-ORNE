# Navegación (Expo Router)

## Árbol de rutas

```
app/
├── _layout.tsx              # AuthProvider global (Stack raíz)
├── index.tsx                # Redirección: sesión → (tabs)/home | sin sesión → (auth)/login
│
├── (auth)/
│   ├── login.tsx            # F00
│   └── register.tsx         # F00
│
├── (tabs)/                  # Navegación principal, solo accesible con sesión
│   ├── _layout.tsx          # Tab bar (Home, Mis pedidos, Perfil)
│   ├── home.tsx             # F1.1 Catálogo base (paginado)
│   ├── pedidos.tsx          # Lista de pedidos del usuario (incluye borradores)
│   └── perfil.tsx           # Datos de cuenta, cerrar sesión
│
└── pedido/
    ├── nuevo/
    │   ├── index.tsx         # Paso 1: tamaño + niveles
    │   ├── sabor.tsx          # Paso 2: sabor de pan + relleno (F1.2)
    │   ├── decoracion.tsx     # Paso 3: mensaje + imagen de referencia (F1.3)
    │   ├── entrega.tsx        # Paso 4: domicilio/sucursal + mapa + fecha (F02)
    │   ├── pago.tsx           # Paso 5: método de pago (F3.1)
    │   └── confirmacion.tsx   # Paso 6: resumen + ID generado (F3.2, F3.3)
    └── [id].tsx               # Detalle de un pedido ya existente (consulta, no edición)
```

## Reglas de navegación del wizard (pedido/nuevo/*)

- Cada paso debe poder **regresar** al anterior sin perder los datos ya capturados
  (requisito del cliente: "permitir regresar a pasos anteriores").
- El estado del pedido en construcción vive en un **Context** (`PedidoContext`), no en
  cada pantalla, para que sobreviva al ir y venir entre pasos.
- **Guardar progreso**: en cualquier paso, el usuario puede salir; el pedido se guarda en
  Supabase con `estado = 'borrador'` y aparece en `(tabs)/pedidos.tsx` para retomarlo
  (botón "Continuar pedido").
- Solo al llegar a `confirmacion.tsx` el pedido pasa de `borrador` a `pendiente`.

## Datos que viajan entre pantallas

```
pedido/nuevo/*  → todas comparten el mismo pedido_id (creado como 'borrador' al
                   iniciar el paso 1, o recuperado si viene de "Continuar pedido")
(tabs)/pedidos  → pedido/[id]      (viaja: id del pedido)
```
