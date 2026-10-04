# Backend — separación de repositorio

Tu profesor pidió que el backend viva aparte del proyecto móvil. Como usamos
Supabase (backend-as-a-service), no hay un servidor propio que programemos línea
por línea, pero el **esquema de base de datos, políticas de seguridad y
configuración** sí deben vivir en su propio repositorio, independiente del código
de la app.

## Qué mover

De tu repo actual (`pastelapp`), saca la carpeta `supabase/` completa.

## Pasos

1. Crea un repositorio nuevo en GitHub, ej. `ornepastel-backend`.
2. En tu máquina, crea una carpeta aparte (fuera de `pastelapp/`) y mueve ahí la
   carpeta `supabase/` (con `migrations/`).
3. Agrega un `README.md` documentando: qué es Supabase, cómo crear el proyecto,
   cómo aplicar las migraciones en orden, y las variables de entorno que el
   frontend necesita (sin exponer valores reales).
4. `git init`, `git add .`, `git commit -m "Esquema inicial de base de datos"`,
   conecta el remoto y `git push` — igual que hiciste con el proyecto móvil.
5. En el repo del **frontend** (`pastelapp`), borra la carpeta `supabase/` y en su
   lugar deja una nota en el `README.md`: *"El esquema de base de datos vive en
   [link al repo backend]"*.

## Resultado

```
ornepastel-backend/          ornepastel-app/ (tu proyecto actual, renómbralo si quieres)
├── supabase/                ├── app/
│   └── migrations/          ├── src/
└── README.md                └── (ya no tiene carpeta supabase/)
```

Esto es justo lo que tu profesor espera ver: **la especificación y el esquema de
datos como una pieza independiente del código de la app**, consultable sin tener
que abrir el proyecto móvil.
