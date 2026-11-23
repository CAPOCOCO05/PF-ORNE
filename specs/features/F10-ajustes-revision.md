# Feature F10: Ajustes para la revisión final

> Ajustes pedidos tras probar la app y puntos de la lista de revisión del profesor.
> Cada ajuste es independiente.

## A1. CLABE ficticia por pedido
El comprobante mostraba una CLABE de ceros. Ahora cada pedido muestra su propia CLABE
ficticia de 18 dígitos.
- **D1.** Se deriva del id del pedido en la app (`src/utils/pago.ts`): 17 dígitos
  pseudoaleatorios + dígito verificador real (pesos 3, 7, 1). Siempre es la misma
  para el mismo pedido; no se guarda en la base (sin migración).

- [x] `generarClabe`, `digitoControlClabe` y `formatearClabe` con pruebas unitarias.
- [x] `Comprobante` muestra la CLABE del pedido; se quita la CLABE fija de `constants/pago.ts`.

## A2. Tras registrarse se abre el pastel elegido
Un visitante tocaba "Pedir", se registraba y llegaba al catálogo en vez del pedido.
- **Causa.** Al iniciar sesión el perfil tarda en cargar; `GuardiaRol` mostraba el
  spinner en lugar de las pestañas, las desmontaba y al volver a montarlas abrían
  "home", perdiendo la navegación a `/pedido/nuevo`.
- **D2.** En la sección del cliente (`permitirInvitado`), si ya se estaba mostrando,
  no se desmonta mientras carga el perfil. Al abrir la app en frío sigue el spinner.

- [x] `GuardiaRol` conserva la navegación; pruebas de ambos casos.

## A3. Catálogo solo con "Filtrar"
- [x] Se quita el desplegable "Ordenar"; el catálogo se muestra por nombre.

## A4. El teclado no tapa los campos
`KeyboardAvoidingView` no hacía nada en Android (`behavior` undefined) y con
edge-to-edge (SDK 58) Android ya no reacomoda la pantalla.
- **D3.** Componente `VistaTeclado`: `behavior="padding"` en ambas plataformas y
  offset igual a su posición real en pantalla (encabezado, área segura).

- **D3b (iOS).** Probado en iOS, el campo seguía tapado: `KeyboardAvoidingView` encoge
  la pantalla pero el `ScrollView` no se desplaza al campo enfocado. En formularios con
  scroll (`ScrollTeclado`) iOS usa `automaticallyAdjustKeyboardInsets` del `ScrollView`
  (deja espacio al teclado y lleva el campo enfocado a la vista) y se apaga
  `KeyboardAvoidingView` para no duplicar el espacio; Android sigue con `VistaTeclado`.

- [x] Login y registro (`PantallaAuth`), pasos del pedido (`PantallaPaso`), editar
      perfil, alta/edición de pastel (admin) y diálogos (motivo de no entrega).
- [x] `ScrollTeclado` para los formularios con scroll (corrección de iOS).

## A5. Doble toque
- [x] `Boton` ignora un segundo toque en 600 ms si la pantalla no cambió entre
      ambos (antes de que llegue `cargando`). Un diálogo nuevo o un formulario
      editado vuelven a responder.

## A6. Datos inválidos y textos largos
- [x] Número exterior: debe empezar con un número positivo ("123", "123-B") o ser
      "S/N"; rechaza "abc" y "-5" (pedido y perfil).
- [x] Límite de caracteres en correo (254), contraseña (72) y búsqueda de dirección.

## A7. Aviso de "Sin conexión a internet"
En modo avión la app decía "Ocurrió un error" en lugar de avisar que no hay internet.
- **Causa.** Desde Expo SDK 52 el `fetch` global es `expo/fetch`: sin red lanza
  `"fetch failed: <mensaje nativo>"` (Android "Unable to resolve host…", iOS "The
  Internet connection appears to be offline."), que no reconocía `esErrorDeConexion`
  (solo buscaba "Network request failed").
- **D4.** Se reconocen los mensajes de `expo/fetch`, del fetch de React Native y del
  navegador. El texto es "Sin conexión a internet. Revisa tu conexión e inténtalo de
  nuevo" en datos, login/registro y perfil.

- [x] `esErrorDeConexion` reconoce los errores de `expo/fetch`; pruebas con sus mensajes.
- [x] Subir imágenes y cambiar estado (admin y repartidor) también avisan la falta de conexión.

## A8. Banner de conexión
Aviso flotante en toda la app en cuanto se pierde el internet, sin esperar a que falle
una acción.
- **D5.** Dependencia `expo-network` (oficial de Expo, funciona en Expo Go):
  `useNetworkState()`. Sin conexión = `isConnected === false` o
  `isInternetReachable === false`; si el estado aún no se conoce no se avisa.
- **D6.** Pastilla arriba (vino `#5b0e17`) con "Sin conexión a internet" mientras dure;
  al volver, "Conexión restablecida" en rosa por 2.5 s. No bloquea toques y se anuncia
  al lector de pantalla.

- [x] `estaSinConexion` (utils) y `BannerConexion` con pruebas; montado en `app/_layout.tsx`.

- **D7 (iPhone, F11).** En modo avión salía el mensaje "Sin conexión" en la pantalla pero
  no el banner: el banner dependía solo de que el sistema avisara el cambio de red, y en el
  iPhone ese aviso no llegaba. Ahora:
  - **El banner también se basa en las peticiones.** Si una petición a la API no recibe
    respuesta, `api.ts` lo marca (`eventosRed`) y el banner aparece aunque el sistema diga que
    hay red. Mientras está visible prueba `GET /salud` cada 4 s (`saludApi`, límite de 3 s);
    cuando responde muestra "Conexión restablecida". Cualquier respuesta de la API quita el aviso.
  - El estado del sistema (`expo-network`) se sigue usando, y se vuelve a consultar cuando la
    app regresa al frente (al usar el centro de control el aviso del cambio se puede perder).
  - Los diálogos (`Modal`) abren su propia ventana y tapan el banner: cada diálogo lo muestra
    también dentro.
  - Efecto: si la API está apagada o la PC está en otra red, también aparece el banner (la
    app no puede hacer nada sin la API).

- [x] `useSinConexion` / `useEstadoRed`, `eventosRed` y `saludApi` con pruebas; `BannerConexion` los usa.
- [x] Probar en el dispositivo (iPhone): modo avión desde el centro de control, y con un diálogo abierto.

## Lista de revisión del profesor
| Prueba | Cómo responde la app |
|---|---|
| Modo avión | Banner "Sin conexión a internet" (A8: por el aviso del sistema o en cuanto una petición a la API no recibe respuesta, también encima de los diálogos) y "Conexión restablecida" al volver; cada pantalla con datos muestra "Sin conexión a internet…" con "Reintentar" (A7); el borrador del pedido no se pierde (F05) |
| Formulario vacío | Errores junto a cada campo y no avanza (F00, F01–F03, F07) |
| Texto donde va número / negativo | Teléfono exige 10 dígitos; número exterior valida formato (A6); tamaños y niveles se eligen, no se escriben |
| Texto muy largo | `maxLength` en todos los campos: nombre 80, dirección 100, referencias 200, decoración con contador, correo 254, contraseña 72 |
| Guardar dos veces | `Boton` se bloquea con `cargando` y con A5 |
| Horizontal | La app está fija en vertical (`"orientation": "portrait"` en `app.json`) |
| Salir y volver | La sesión se guarda (AsyncStorage); el pedido se guarda como borrador en cada paso y se retoma desde "Mis pedidos" |
| Negar permiso | Ubicación: el mapa abre en la sucursal y queda la búsqueda por texto. Galería: aviso con opción "Abrir ajustes"; si la galería falla al abrir, mensaje en lugar de error (`useElegirImagen`). La app no usa la cámara |
| Lista vacía | Catálogo, Mis pedidos, panel admin, catálogo admin y entregas muestran un mensaje de lista vacía |
| Error inesperado al dibujar una pantalla | `ErrorBoundary` en `app/_layout.tsx` (`PantallaError`): "Algo salió mal" con "Reintentar" en lugar de la pantalla roja |
| Datos inválidos que lleguen a pesar de la app | La API valida cada campo y responde el error (F11 D6); la app lo muestra |
