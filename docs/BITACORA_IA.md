# Bitácora de IA — ORNE

Registro de las interacciones más importantes con el asistente de IA (Claude Code) durante el desarrollo de ORNE, del 23 de octubre al 21 de noviembre de 2026.

En total hubo 11 sesiones de trabajo. Se eligieron las 10 interacciones donde hubo un problema real, una corrección o un aprendizaje. Las peticiones de rutina ("haz commit y push", "analiza en qué nos quedamos") no se incluyen, salvo la primera, porque describe el método de trabajo.

Las decisiones técnicas que salieron de estas interacciones están en [DIARIO_DECISIONES.md](DIARIO_DECISIONES.md).

| # | Fecha | Tema |
|---|---|---|
| 1 | 23/10/2026 | Método de trabajo con specs y features |
| 2 | 23/10/2026 | Error al correr la migración 008 en Supabase |
| 3 | 25/10/2026 | Actualización a Expo SDK 58 |
| 4 | 03/11/2026 | F06: entregas del repartidor |
| 5 | 05/11/2026 | Spec F07 con mis ideas de mejora |
| 6 | 17/11/2026 | Barra de navegación inferior (F08) |
| 7 | 20/11/2026 | Modo avión: mensaje y banner de "Sin conexión" |
| 8 | 20/11/2026 | El teclado tapaba los campos en iOS |
| 9 | 21/11/2026 | Cambio de arquitectura a capas |
| 10 | 21/11/2026 | Nueva paleta de colores |

---

### Interacción #1 — Método de trabajo con specs y features
**Fecha:** 23/10/2026

**Qué le pedí (prompt):**
"Analiza el proyecto e identifica cuál es el paso a seguir."
Al inicio de cada sesión usé esta misma petición para retomar el trabajo.

**Qué me dio (resumen):**
Una tabla con el estado de cada feature (F00 y F01 completas, F02 en curso) y un plan por pasos para continuar. Antes de modificar código esperaba mi confirmación, como indica `AGENTS.md`.

**Qué estaba mal o me faltó:**
Cuando aprobé los primeros pasos de F02, solo programó la base (dependencias y servicio de ubicación). En la app no se veía ningún cambio: el pedido seguía terminando en "Decoración" con el botón "Guardar pedido".

**Qué corregí o cambié yo:**
Le reporté lo que veía en la app. Me explicó que faltaba la pantalla del paso de entrega, le pedí continuar y probé el paso completo (mapa, calendario y horarios) antes de marcar F02 como terminada.

**Qué aprendí:**
Tener las specs con criterios de aceptación permite que cada sesión retome el trabajo donde se quedó. También aprendí a pedir que me diga qué voy a poder ver en la app después de cada paso, porque "las pruebas pasan" no siempre significa que haya algo visible.

---

### Interacción #2 — Error al correr la migración 008 en Supabase
**Fecha:** 23/10/2026

**Qué le pedí (prompt):**
"Error en supabase: Failed to run sql query: ERROR: 42701: column "calle" of relation "pedidos" already exists"

**Qué me dio (resumen):**
Me explicó que el error no indicaba un fallo, sino que la migración 008 ya estaba aplicada y la había corrido por segunda vez. Me dio una consulta para revisar qué columnas, restricciones y funciones existían.

**Qué estaba mal o me faltó:**
Yo no sabía que el SQL Editor de Supabase solo muestra el resultado de la última consulta. Por eso creí que solo se habían creado tres restricciones y que faltaba lo demás.

**Qué corregí o cambié yo:**
Corrí la consulta de verificación, confirmé que todo estaba creado y no volví a ejecutar la migración.

**Qué aprendí:**
Un error de "ya existe" al correr una migración suele significar que ya se aplicó. Antes de repetir una migración hay que revisar qué hay en la base. Desde entonces anoto cuáles migraciones ya corrí.

---

### Interacción #3 — Actualización a Expo SDK 58
**Fecha:** 25/10/2026

**Qué le pedí (prompt):**
"Tenemos que actualizar el proyecto a SDK 58 ya que la app de Expo lo pide."

**Qué me dio (resumen):**
Actualizó `expo` y alineó las dependencias con `expo install --fix` (React Native 0.88, expo-router, maps, reanimated, etc.). Revisó todo con `expo-doctor`, las pruebas y el typecheck.

**Qué estaba mal o me faltó:**
La actualización dejó detalles que no se ven a simple vista: `expo install` agregó un plugin duplicado en `app.json`, sobraba la opción `newArchEnabled` (en SDK 58 ya es obligatoria) y hubo que ajustar la configuración de pruebas.

**Qué corregí o cambié yo:**
Probé el panel admin en el celular con la nueva versión y confirmé que todo funcionaba. Se guardó en un commit aparte de la feature F04.

**Qué aprendí:**
Expo Go solo abre proyectos con el SDK más reciente, así que actualizar no es opcional. Conviene hacerlo en un commit separado y revisarlo con `expo-doctor`, porque los comandos automáticos pueden dejar configuración duplicada.

---

### Interacción #4 — F06: entregas del repartidor
**Fecha:** 03/11/2026

**Qué le pedí (prompt):**
"Revisa y analiza el proyecto, identifica cuál es el paso a seguir", y después "continúa" para programar F06.

**Qué me dio (resumen):**
Las pantallas del repartidor (mis entregas, detalle con mapa, "Cómo llegar" y "Marcar como entregado"), 24 pruebas nuevas, la migración 010 y un script para probar los permisos en Supabase.

**Qué estaba mal o me faltó:**
Encontró un hueco en los permisos: con las reglas RLS existentes, el repartidor no podía leer el nombre del cliente, así que la lista habría mostrado "Sin nombre". Además, hizo el commit en una rama nueva sin preguntarme, aunque yo trabajaba directo en `main`.

**Qué corregí o cambié yo:**
Apliqué la migración 010, corrí el script de permisos (todo salió OK), probé el flujo admin → repartidor en el celular y elegí hacer el merge directo a `main` para mantener el historial como antes.

**Qué aprendí:**
Con RLS, cada rol solo ve lo que sus políticas permiten. Una pantalla nueva puede necesitar permisos nuevos en la base, y hay que probarlos con un script que simule a cada usuario.

---

### Interacción #5 — Spec F07 con mis ideas de mejora
**Fecha:** 05/11/2026

**Qué le pedí (prompt):**
"Agrega una spec/feature para agregar algunos detalles que podríamos mejorar: repartidor, agregar estado de pedido cancelado (quizás lo va a repartir pero no lo reciben); admin, agregar publicaciones al catálogo; mensajes de confirmación personalizados según el estilo de la app; cliente, filtrado en el catálogo; admin, filtrado en la pestaña 'Activos'."

**Qué me dio (resumen):**
La spec F07 con 5 mejoras (M1 a M5), cada una con decisiones, criterios de aceptación y tareas. Las reordenó para que cada mejora se apoyara en la anterior; por ejemplo, primero los diálogos propios, porque las demás los usan.

**Qué estaba mal o me faltó:**
En M3 interpretó el filtro de forma distinta a lo que yo quería. A la spec también le faltaban dos cosas que noté al revisarla: pedir el nombre completo del cliente y que el cliente pudiera ver y editar sus datos en el perfil.

**Qué corregí o cambié yo:**
Precisé M3 (chips para ver solo "Listos" o "En camino" dentro de "Activos"), confirmé el estado `no_entregado` para M2 y agregué M6 (nombre completo) y M7 (perfil con teléfono y dirección editables). En M5 pedí que el filtro no estorbara, como un menú desplegable, y después ajusté yo mismo los textos de "Ordenar".

**Qué aprendí:**
Escribir y revisar la spec antes de programar evita rehacer trabajo. Es más fácil corregir una interpretación en el documento que en el código.

---

### Interacción #6 — Barra de navegación inferior (F08)
**Fecha:** 17/11/2026

**Qué le pedí (prompt):**
"Cambiar a barra de navegación inferior (tabs) en lugar de menú lateral; agregar aviso de privacidad."
Después respondí sus preguntas: la barra se ve siempre, el correo de contacto es orne@orne.com y el aviso solo muestra el mensaje.

**Qué me dio (resumen):**
Pestañas por rol (Cliente: Catálogo · Mis pedidos · Perfil; Admin: Pedidos · Catálogo · Perfil; Repartidor: Mis entregas · Perfil), "Cerrar sesión" movido a Perfil y la pantalla del aviso de privacidad. Las pruebas pasaban.

**Qué estaba mal o me faltó:**
Al probar en el celular, los botones "Pedir", "Crear pedido" y "Continuar pedido" no hacían nada. La IA había ocultado las pantallas del pedido con `href: null`, que en esta versión de expo-router las bloquea y regresa a la primera pestaña. El mismo error rompía los detalles de pedido, la edición del catálogo y "Editar datos". Las pruebas automáticas no lo detectaron.

**Qué corregí o cambié yo:**
Probé el flujo en el dispositivo, reporté el error y, cuando quedó corregido, volví a probar todas las pantallas de detalle antes de subirlo a `main`.

**Qué aprendí:**
Que pasen las pruebas no garantiza que la navegación funcione: hay que probar en el celular. Un cambio de navegación afecta muchas pantallas a la vez.

---

### Interacción #7 — Modo avión: mensaje y banner de "Sin conexión"
**Fecha:** 20/11/2026 y 21/11/2026

**Qué le pedí (prompt):**
"Al poner modo avión no aparece el mensaje dentro de la app de que se perdió la conexión, solo dice que ocurrió un error y que lo vuelva a intentar, pero debería decir que perdió la conexión."

**Qué me dio (resumen):**
Detectó la causa: en SDK 58, `expo/fetch` reemplaza al `fetch` de React Native y da otros mensajes sin internet, que la app no reconocía. Corrigió el mensaje a "Sin conexión a internet" y agregó un banner con `expo-network`.

**Qué estaba mal o me faltó:**
Después del cambio de arquitectura, en mi iPhone salía el mensaje pero no el banner. El primer intento de corrección tampoco funcionó, porque seguía dependiendo de que el sistema avisara del cambio de red, y en iPhone ese aviso no llegaba.

**Qué corregí o cambié yo:**
Probé en el iPhone después de cada intento y le dije claramente que seguía sin aparecer. La segunda corrección hace que el banner aparezca también cuando una petición a la API no responde, y que revise la conexión cada 4 segundos. Esa sí funcionó.

**Qué aprendí:**
El comportamiento cambia entre Android e iOS y entre versiones del SDK. No hay que confiar solo en lo que reporta el sistema; es más seguro usar también lo que pasa con las peticiones reales.

---

### Interacción #8 — El teclado tapaba los campos en iOS
**Fecha:** 20/11/2026

**Qué le pedí (prompt):**
"Agrega KeyboardAvoidingView para que no tape los campos al momento de escribir."
Después: "Aún se sigue tapando el campo, selecciono uno y lo tapa el teclado, estoy usando iOS."

**Qué me dio (resumen):**
Primero agregó `KeyboardAvoidingView` a los formularios. Cuando le reporté que no funcionaba, creó un componente `ScrollTeclado` que en iOS usa `automaticallyAdjustKeyboardInsets` para desplazar la pantalla hasta el campo seleccionado.

**Qué estaba mal o me faltó:**
La primera solución no bastaba en iOS: la pantalla se encogía, pero no se desplazaba hasta el campo. Además, el commit incluyó cambios míos que no había guardado (en registro, perfil y filtros), y esos cambios rompían 6 pruebas.

**Qué corregí o cambié yo:**
Probé en el iPhone y confirmé que la segunda solución funcionaba. Se hizo un commit extra para ajustar las pruebas sin cambiar mi código. Desde entonces reviso si tengo cambios sin guardar antes de pedir un commit.

**Qué aprendí:**
`KeyboardAvoidingView` no se comporta igual en iOS y en Android. También aprendí a revisar `git status` antes de un commit para saber exactamente qué va a entrar.

---

### Interacción #9 — Cambio de arquitectura a capas
**Fecha:** 21/11/2026

**Qué le pedí (prompt):**
"Ahora viene una parte muy importante, tenemos que cambiar la arquitectura del proyecto, ¿qué te parece en capas? ¿o cuál me recomiendas? Me gustaría tener en mi carpeta de backend todo lo que es back, más estructurado."

**Qué me dio (resumen):**
Recomendó capas en lugar de MVC y propuso una API en Express con rutas/controladores, servicios y repositorios. Hizo la migración módulo por módulo (catálogo, perfil, pedidos, admin y repartidor), con un commit por módulo y pruebas en el backend y el frontend.

**Qué estaba mal o me faltó:**
Después del primer módulo, el catálogo dejó de cargar en el celular. No faltaban archivos: la API no estaba corriendo y Expo no había leído la nueva variable `EXPO_PUBLIC_API_URL`. Además, la IA dejó un proceso de la API ocupando el puerto 3000 en mi PC.

**Qué corregí o cambié yo:**
Levanté la API con `npm run dev`, reinicié Expo con `npx expo start -c` y comprobé `/salud` desde el navegador del celular. Probé cada módulo antes de pasar al siguiente y al final probé los tres roles en el dispositivo.

**Qué aprendí:**
La diferencia entre MVC y capas, y por qué capas se adapta mejor a este proyecto. Con un backend propio, la app depende de que la API esté corriendo y sea accesible desde el celular. Las variables `EXPO_PUBLIC_*` solo se leen al arrancar Expo.

---

### Interacción #10 — Nueva paleta de colores
**Fecha:** 21/11/2026

**Qué le pedí (prompt):**
"La nueva paleta de colores está en specs/design_2/."
Después: "En salir del pedido, el botón de salir está café y las letras no se ven, cámbialo a un rosa más fuerte, revisa si sucede en algún otro lugar."

**Qué me dio (resumen):**
Aplicó la paleta rosa y café en `colors.ts`, avisó que los rosas claros no servían como texto y agregó un color de acento. Después cambió el catálogo a tarjetas, como en el diseño.

**Qué estaba mal o me faltó:**
Los botones de acciones destructivas quedaron con fondo café y texto café, así que no se leían. El error se repetía en 5 diálogos (salir del pedido, eliminar borrador, salir sin guardar, cancelar pedido y "no entregado").

**Qué corregí o cambié yo:**
Lo detecté al probar en el celular y pedí un rosa más fuerte y que revisara toda la app. Quedó `#ec7c9b` con letras café, con contraste de 4.7:1. También le pedí revisar el logo en "Mis pedidos".

**Qué aprendí:**
Al cambiar una paleta hay que revisar el contraste entre texto y fondo, no solo los colores sueltos. Tener los colores centralizados en un archivo hace que el cambio sea rápido, pero un error también se repite en todas partes.
