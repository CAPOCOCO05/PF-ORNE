# Feature F08: Barra de navegación inferior y aviso de privacidad

> Dos mejoras independientes. Las decisiones marcadas **✅ Confirmado** fueron
> validadas con el equipo (2026-11-16); el resto son decisiones técnicas.

| # | Mejora | Rol | Estado |
|---|---|---|---|
| N1 | Barra de navegación inferior (pestañas) en lugar del menú lateral | Todos | ✅ Completa |
| N2 | Aviso de privacidad (consulta; se informa al registrarse) | Todos | ✅ Completa |

**Orden sugerido:** N1 → N2. N2 agrega la opción "Aviso de privacidad" al perfil,
que con N1 se vuelve la pantalla desde donde se llega a todo lo que no es una pestaña.

---

## N1. Barra de navegación inferior (tabs)

### Objetivo
Reemplazar el menú lateral (Drawer) por una barra de pestañas inferior: las
secciones quedan siempre a la vista y a un toque, al alcance del pulgar, sin abrir
un menú oculto.

### Diseño
- Barra fija abajo, fondo `#f6f4f3`, borde superior sutil, respetando el área
  segura inferior (`useSafeAreaInsets`).
- Cada pestaña: ícono + etiqueta. Activa en `#b2181d`; inactiva en `#5b0e17` con
  opacidad reducida.
- Pestañas por rol:

  | Cliente | Admin | Repartidor |
  |---|---|---|
  | Catálogo | Pedidos | Mis entregas |
  | Mis pedidos | Catálogo | Perfil |
  | Perfil | Perfil | |

- Encabezado: se quita el ícono hamburguesa y el ícono de perfil (el perfil ya es
  una pestaña); queda solo el logo ORNE sobre `#f6f4f3`.
- "Cerrar sesión" sale del menú y queda solo en la pantalla de Perfil (ya existe ahí
  en los tres roles).

### Decisiones
- **D1. Sin dependencias nuevas.** Se usa `Tabs` de `expo-router/tabs` (incluido
  en `expo-router`). Los íconos se dibujan con `react-native-svg` en
  `src/components/Iconos.tsx`, como los actuales.
- **D2. Componente compartido.** `MenuLateral` se reemplaza por
  `BarraNavegacion` (`src/components/BarraNavegacion.tsx`): `opciones` (ruta, título
  e ícono) y `ocultas` (ruta sin pestaña → pestaña que se resalta). La barra es
  propia (`tabBar`) para resaltar la pestaña correcta en rutas ocultas (D5).
- **D3. Rutas ocultas.** El wizard (`pedido/nuevo`), los detalles (`[id]`) y
  `perfil/editar` siguen sin pestaña propia (la barra solo dibuja las `opciones`; **no** se usa
  `href: null`, que en expo-router 58 oculta la ruta y redirige a la primera pestaña) y conservan
  `popToTopOnBlur`.
- **D4. Barra siempre visible. ✅ Confirmado.** La barra se muestra en todas las
  pantallas de la sección, incluidos el wizard (`pedido/nuevo/*`) y los detalles, y
  persiste al cambiar de pestaña. Si el cliente cambia de pestaña a mitad del
  pedido, lo guardado en el último "Siguiente" sigue en "Mis pedidos" como borrador
  para retomarlo (F01 D2); lo capturado después de ese "Siguiente" se pierde, igual
  que al cerrar la app (F01 D3).
- **D5. Pestaña resaltada en rutas ocultas.** En un detalle se resalta la pestaña
  de la que se llegó (`pedido/[id]` → Mis pedidos, `admin/pedido/[id]` → Pedidos,
  `admin/catalogo/[id]` → Catálogo, `entrega/[id]` → Mis entregas,
  `perfil/editar` → Perfil).
- **D6. Guardias sin cambios.** `GuardiaRol` sigue envolviendo cada sección.
- **D7. Dependencias del Drawer.** `react-native-gesture-handler` y
  `react-native-reanimated` se conservan (las usa Expo Router/Reanimated); quitarlas
  queda fuera de esta mejora.

### Criterios de aceptación
- [x] Cada rol ve sus pestañas abajo y ya no hay menú lateral ni ícono hamburguesa.
- [x] Tocar una pestaña abre su sección; desde un detalle o el wizard, tocar la pestaña resaltada regresa a su pantalla principal.
- [x] Las pantallas del wizard y los detalles no aparecen como pestaña, y la barra se ve también en ellas (D4).
- [x] La barra respeta el área segura inferior en Android e iOS.
- [x] Un usuario sigue sin poder abrir la sección de otro rol.

### Tareas
- [x] Íconos `IconoCatalogo`, `IconoPedidos`, `IconoEntregas` (y reutilizar `IconoPerfil`) en `Iconos.tsx`.
- [x] `src/components/BarraNavegacion.tsx` con `Tabs` (D1–D5).
- [x] Ajustar `Encabezado` (sin menú ni perfil).
- [x] Cambiar `(cliente)/_layout.tsx`, `admin/_layout.tsx` y `repartidor/_layout.tsx`; borrar `MenuLateral.tsx`.
- [x] Actualizar `01-navigation.md` (sección "Encabezado y menú").
- [x] Pruebas: pestaña resaltada en rutas ocultas (`BarraNavegacion.test.tsx`).
- [x] Probar criterios de aceptación en dispositivo ✅.

---

## N2. Aviso de privacidad

### Objetivo
Informar al usuario qué datos personales recaba ORNE, para qué y cómo ejercer sus
derechos, e informarle al crear la cuenta que al registrarse lo acepta (Ley Federal de Protección
de Datos Personales en Posesión de los Particulares, LFPDPPP).

### Pantallas
- `app/aviso-privacidad.tsx` — **fuera de las secciones de rol**, para que se pueda
  abrir sin sesión (desde el registro) y con sesión (desde el perfil). Texto con
  desplazamiento, título "Aviso de privacidad", fecha de última actualización y
  botón "Atrás".
- **Registro:** debajo del botón REGISTRARME, el mensaje "Al registrarte aceptas
  nuestro **Aviso de privacidad**"; el texto subrayado abre la pantalla (D3).
- **Login:** enlace pequeño "Aviso de privacidad" al pie de la tarjeta.
- **Perfil (los tres roles):** opción "Aviso de privacidad" antes de "Cerrar sesión".

### Contenido mínimo (LFPDPPP)
1. Identidad y domicilio del responsable: Pastelería ORNE, Calle Primera, C.P.
   22785, Ensenada, B.C.
2. Datos que se recaban: nombre completo, correo, teléfono, dirección de entrega y
   ubicación del pin en el mapa, imagen de referencia del pastel. No se recaban
   datos sensibles ni financieros (el pago es simulado y la app no pide tarjetas).
3. Finalidades primarias: crear la cuenta, elaborar y entregar el pedido,
   contactar al cliente sobre su pedido. Finalidades secundarias: ninguna.
4. Permisos del dispositivo: ubicación (solo para ubicar el pin, al usarse) y
   galería (solo la imagen que el usuario elige).
5. Transferencias: no se comparten con terceros; se almacenan con el proveedor de
   infraestructura (Supabase) y el repartidor ve solo los datos de su entrega.
6. Derechos ARCO (acceso, rectificación, cancelación, oposición) y revocación del
   consentimiento: medio de contacto y plazo de respuesta.
7. Cambios al aviso: se publican en la app con nueva fecha.

### Decisiones
- **D1. Texto en la app.** El contenido vive en `src/constants/avisoPrivacidad.ts`
  (secciones con título y párrafos, `VERSION_AVISO` y fecha), no en un sitio web,
  para que funcione sin conexión y se pruebe.
- **D2. Contacto ARCO. ✅ Confirmado.** `orne@orne.com`, con respuesta en un
  máximo de 20 días hábiles (plazo de la LFPDPPP).
- **D3. Solo se informa. ✅ Confirmado.** El registro muestra el mensaje "Al
  registrarte aceptas nuestro Aviso de privacidad" con enlace a la pantalla; no hay
  casilla ni validación.
- **D4. Sin registro de la aceptación. ✅ Confirmado.** No se guarda en la base qué
  versión aceptó cada usuario ni cuándo; no hace falta migración.
- **D5. Cuentas existentes.** No se les obliga a aceptar de nuevo; pueden
  consultarlo desde el perfil. (Si en el futuro cambia la versión, se podría pedir
  aceptación al iniciar sesión; fuera de esta mejora.)
- **D6. Texto de ejemplo.** Al ser un proyecto escolar, el aviso es una plantilla
  basada en la LFPDPPP; debe revisarlo la pastelería antes de un uso real.

### Criterios de aceptación
- [x] El aviso se puede leer sin sesión (desde login y registro) y con sesión (desde el perfil de cada rol).
- [x] El registro informa que al registrarse se acepta el aviso, con enlace para leerlo.
- [x] El aviso incluye responsable, datos recabados, finalidades, permisos, transferencias y derechos ARCO.

### Tareas
- [x] `src/constants/avisoPrivacidad.ts` con el contenido (D1, D2).
- [x] `app/aviso-privacidad.tsx` (lo registra el Stack raíz) y su prueba.
- [x] Mensaje con enlace en `register.tsx` (D3) y su prueba.
- [x] Enlaces en `login.tsx` y en el perfil de los tres roles, con prueba.
- [x] Actualizar `01-navigation.md` y F00.
- [x] Probar criterios de aceptación (pruebas de la app y dispositivo ✅).
