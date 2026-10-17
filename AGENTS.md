
## Estilo de Código y Buenas Prácticas
- **Tipado estricto:** Prohibido el uso de `any` a menos que sea estrictamente necesario y justificado.
- **Nombres descriptivos:**
  - Componentes/Clases: `PascalCase`
  - Funciones, métodos y variables: `camelCase`
  - Constantes globales / Enums: `UPPER_SNAKE_CASE`
  - Archivos: `kebab-case` o `PascalCase` para componentes.
- **Manejo de errores:**
  - Valida inputs en los límites del sistema (APIs, formularios, parámetros).
  - Devuelve mensajes de error accionables y no silencies excepciones sin registrar el motivo.
- **Modularidad:** Funciones pequeñas y con responsabilidad única (máx. 30–40 líneas por función como recomendación).

---

## Reglas de Operación del Agente (Obligatorias)
1. **Confirmación antes de ejecutar cambios:** Antes de escribir, modificar código o aplicar refactorizaciones, presenta un resumen claro de los archivos que planeas alterar y la estrategia que vas a seguir. Espera la confirmación del usuario antes de proceder, a menos que el usuario haya ordenado explícitamente aplicar la solución de inmediato.
2. **No inventar dependencias:** Antes de sugerir o agregar una biblioteca externa (`npm install`, `pip install`), revisa si el problema se puede resolver con las dependencias ya instaladas.
3. **Ediciones quirúrgicas:** Al editar código existente, modifica únicamente las partes necesarias. No reformatees archivos completos sin motivo ni borres comentarios existentes.
4. **Validación previa a la entrega:**
   - Antes de dar por concluida una tarea, ejecuta mentalmente o mediante comandos disponibles: `lint`, `typecheck` y las pruebas relacionadas.
   - Si creas una nueva función de utilidad o endpoint, añade su correspondiente prueba unitaria.
5. **Respeto a secretos:** Nunca expongas credenciales, API keys o tokens en el código ni en los commits. Utiliza variables de entorno (`.env.example`).
6. **Explicación concisa:** Resume brevemente qué cambiaste y por qué, priorizando el código funcional sobre explicaciones teóricas extensas.
7. **Seguimiento de tareas (Checklist):** Marca como completadas (`- [x]`) las subtareas y funcionalidades terminadas dentro del plan de la feature conforme se finalicen, manteniendo siempre actualizado el progreso.