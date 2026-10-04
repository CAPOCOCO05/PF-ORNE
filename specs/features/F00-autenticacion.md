# Feature F00: Autenticación

> Nota: esta spec se escribió **después** de implementar el código, de forma
> retroactiva, para dejar documentado por qué existe y qué cubre. A partir de F01,
> el flujo correcto es spec → tareas → código.

## Objetivo
Permitir que un cliente cree una cuenta e inicie sesión, para poder asociar sus
pedidos a su perfil y recuperar su sesión al volver a abrir la app.

## Actor
Cliente.

## Precondiciones
Ninguna (es el punto de entrada de la app).

## Datos de entrada
- email (obligatorio)
- password (obligatorio)
- nombre (obligatorio, solo en registro)

## Flujo principal
1. El usuario abre la app → `app/index.tsx` revisa si hay sesión guardada.
2. Sin sesión → se muestra `login.tsx`.
3. El usuario ingresa credenciales y presiona "Ingresar".
4. Supabase valida y crea la sesión; se guarda en el dispositivo (AsyncStorage).
5. La app redirige automáticamente a `(tabs)/home`.

## Validaciones
- Email y password no pueden estar vacíos.
- Formato de email válido.
- Password mínimo 6 caracteres (regla por defecto de Supabase Auth).

## Casos de error
- Credenciales inválidas → mensaje "Correo o contraseña incorrectos".
- Email ya registrado (en registro) → mensaje "Este correo ya tiene una cuenta".
- Sin conexión → mensaje "Error de conexión, inténtalo de nuevo".

## Resultado esperado
Sesión activa y persistente; el usuario no necesita volver a loguearse cada vez
que abre la app.

## Criterios de aceptación
- [x] El usuario puede iniciar sesión con credenciales válidas.
- [x] La sesión persiste al cerrar y reabrir la app.
- [ ] El registro (`signUp`) está conectado a una pantalla funcional (pendiente).
- [ ] Los mensajes de error se muestran de forma clara en pantalla (hoy usan
      `Alert.alert`, se puede mejorar visualmente).

## Tareas
- [x] Cliente de Supabase (`src/services/supabase.ts`).
- [x] `AuthContext` con `signIn`, `signUp`, `signOut`.
- [x] `app/_layout.tsx` con `AuthProvider`.
- [x] `app/index.tsx` con redirección según sesión.
- [x] Pantalla de login funcional.
- [ ] Pantalla de registro funcional (hoy solo placeholder).
- [ ] Pulir manejo visual de errores.
