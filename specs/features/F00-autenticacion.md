# Feature F00: Autenticación y redirección por rol

> Nota: la primera versión de esta spec se escribió **después** de implementar el
> cliente de Supabase y el `AuthContext`, de forma retroactiva. A partir de aquí el
> flujo correcto es spec → tareas → código.

## Objetivo
Permitir que un usuario cree una cuenta o inicie sesión, recuperar su sesión al
volver a abrir la app y llevarlo a la sección que corresponde a su rol (cliente,
admin o repartidor).

## Actor
Cliente, admin y repartidor (todos inician sesión igual; solo el cliente se registra
desde la app).

## Precondiciones
Ninguna (es el punto de entrada de la app).

## Diseño
`design/pantalla_login.png`, con la paleta de `00-project.md`:

- Logo ORNE (`assets/logo.png`) arriba.
- Tarjeta redondeada (`#f6f4f3` sobre fondo blanco) con el ícono de pastel
  (`assets/icono_pastel.png`) asomando por encima.
- Campos con etiqueta en mayúsculas color título: **CORREO** (placeholder
  `ejemplo@gmail.com`) y **CONTRASEÑA** (placeholder `Ingresa tu contraseña`,
  texto oculto). Bordes redondeados color `#5b0e17`.
- Botón **INICIAR SESIÓN** (`#b2181d`, texto blanco) y debajo el enlace pequeño
  "Olvidé mi contraseña".
- Fuera de la tarjeta: "¿No tienes cuenta? **Regístrate**" (enlace a registro).
- Figuras decorativas onduladas al pie de la pantalla (`#88131d` y `#f6f4f3`).

El registro no tiene diseño propio: usa el mismo estilo (logo, tarjeta, campos,
botón **REGISTRARME** y enlace "¿Ya tienes cuenta? **Inicia sesión**").

## Datos de entrada
- correo (obligatorio)
- contraseña (obligatorio)
- nombre completo (obligatorio, solo en registro; máx. 80 caracteres — F07 M6)
- confirmar contraseña (obligatorio, solo en registro)

## Flujo principal — Login
1. El usuario abre la app → `app/index.tsx` revisa si hay sesión guardada.
2. Sin sesión → se muestra `login.tsx`.
3. El usuario ingresa correo y contraseña y presiona "INICIAR SESIÓN".
4. Supabase valida y crea la sesión; se guarda en el dispositivo (AsyncStorage).
5. La app lee el perfil del usuario (tabla `perfiles`) para conocer su rol.
6. Redirige según el rol (ver `01-navigation.md`): cliente → `/home`, admin →
   `/admin`, repartidor → `/repartidor`.

## Flujo principal — Registro
1. Desde el login, el usuario presiona "Regístrate".
2. Captura nombre, correo, contraseña y confirmación.
3. Supabase crea la cuenta; un trigger crea su perfil con rol `cliente`.
4. Inicia sesión automáticamente y entra a `/home`.

## Flujo — Cerrar sesión
Desde el menú lateral o la pantalla de perfil → se borra la sesión y regresa a
`/login`.

## Validaciones
Se muestran en rojo bajo el campo, al salir de él o al presionar el botón (F05).
- Correo y contraseña no pueden estar vacíos.
- Formato de correo válido.
- Contraseña mínimo 6 caracteres (regla por defecto de Supabase Auth).
- Registro: nombre completo con `validarNombreCompleto()` (F07 M6): se aplica
  `trim()` y se colapsan los espacios; al menos dos palabras de 2+ letras; solo
  letras (con acentos y ñ), espacios, apóstrofo y guion. La confirmación debe
  coincidir con la contraseña.
- Mientras se procesa, el botón muestra un spinner y no se puede presionar otra vez.

## Reglas de negocio
- Todo registro desde la app crea un usuario con rol `cliente`. Los roles `admin` y
  `repartidor` se asignan manualmente en Supabase.
- El rol se lee de la base de datos, nunca de los metadatos que envía la app, para
  que un usuario no pueda darse otro rol.
- Si el usuario tiene sesión pero no tiene perfil (caso extremo), se cierra la
  sesión y se muestra "No se pudo cargar tu cuenta, inicia sesión de nuevo".

## Casos de error
- Credenciales inválidas → "Correo o contraseña incorrectos".
- Correo ya registrado → "Este correo ya tiene una cuenta".
- Sin conexión → "Error de conexión, inténtalo de nuevo".
- "Olvidé mi contraseña" → aviso "Próximamente" (fuera de alcance del MVP).

## Resultado esperado
Sesión activa y persistente; el usuario no necesita volver a iniciar sesión cada vez
que abre la app y siempre llega a la sección de su rol.

## Criterios de aceptación
- [x] El usuario puede iniciar sesión con credenciales válidas.
- [x] La sesión persiste al cerrar y reabrir la app.
- [x] La pantalla de login coincide con `design/pantalla_login.png`.
- [x] El registro está conectado a una pantalla funcional y crea un perfil `cliente`.
- [x] Cada rol llega a su sección al iniciar sesión.
- [x] Un usuario no puede abrir la sección de otro rol.
- [x] Los mensajes de error se muestran en pantalla junto al campo o en un aviso
      claro (no solo `Alert.alert` genérico).

## Tareas
- [x] Cliente de Supabase (`src/services/supabase.ts`).
- [x] `authService` + `AuthContext` con `signIn`, `signUp`, `signOut`.
- [x] `app/_layout.tsx` con `AuthProvider`.
- [x] Migración `004_perfiles_roles.sql` (ver `02-data-model.md`).
- [x] Tipo `Perfil` y `getPerfil()` en `authService`; `AuthContext` expone `perfil`.
- [x] `src/theme/colors.ts` con la paleta.
- [x] Componentes `Boton`, `Input`, `FondoOndas` en `src/components/`.
- [x] `login.tsx` según el diseño.
- [x] `register.tsx` funcional.
- [x] `app/index.tsx` con redirección por rol.
- [x] `_layout.tsx` de `(cliente)`, `admin` y `repartidor` con guardia de rol (`GuardiaRol`).
- [x] Pantallas de inicio provisionales con "Cerrar sesión" (el menú lateral pasa a F01).
- [x] Traducir los errores de Supabase a los mensajes de esta spec.
- [x] Probar con un usuario de cada rol.
