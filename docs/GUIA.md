# Guía paso a paso: de cero a Stoa publicada

Sigue los pasos en orden. Cada uno termina con una comprobación: no pases al siguiente hasta que funcione.

---

## Paso 0 · Herramientas

1. Instala **Node.js LTS** (nodejs.org) y **Git** (git-scm.com).
2. En la terminal de VS Code (`Ctrl + ñ`):
   ```bash
   node -v
   npm -v
   git -v
   ```
3. Configura Git una sola vez:
   ```bash
   git config --global user.name "Jerdier"
   git config --global user.email "el-email-de-tu-github"
   ```

✅ Los tres comandos muestran una versión.

---

## Paso 1 · El proyecto en tu ordenador

**Opción A (si el repositorio ya está en tu GitHub):**
```bash
git clone https://github.com/jerdier/stoa.git
cd stoa
npm install
```

**Opción B (si tienes el .zip):** descomprímelo, ábrelo en VS Code y ejecuta `npm install`.

> **Qué es cada cosa**
> - `package.json`: lista de librerías y comandos (`dev`, `build`).
> - `npm install` descarga esas librerías en `node_modules/` (no se sube a GitHub).
> - **Vite** es la herramienta que arranca el servidor de desarrollo y empaqueta la app para producción.
> - **React** pinta la interfaz a partir de componentes (`pages/`, `components/`).

Prueba `npm run dev` y abre la dirección que aparece (normalmente `http://localhost:5173`). Verás la pantalla **"Falta conectar Supabase"**: es lo esperado.

✅ Ves la pantalla de "Falta conectar Supabase".

---

## Paso 2 · Crear la base de datos en Supabase

1. Entra en **supabase.com** con tu GitHub → **New project**.
2. Nombre: `stoa`. Región: la más cercana (Europa, p. ej. Frankfurt o París). Guarda la contraseña de la base de datos en un sitio seguro.
3. Espera a que termine de crearse (1–2 min).
4. Ve a **SQL Editor → New query**, pega **todo** el contenido de `supabase/schema.sql` y pulsa **Run**.
5. Ve a **Table Editor**: deberías ver `profiles`, `blocks`, `routine_items`, `workouts`, `workout_log`, `nutrition`, `meals`, `finance`, `budget_categories`, `expenses` y `friendships`.

> **Qué acabas de hacer**
> - Has creado tablas relacionales en **PostgreSQL**: por ejemplo, `routine_items.block_id` apunta a `blocks.id` (clave foránea). Si borras un bloque, `on delete cascade` borra también sus apariciones en la semana.
> - Has activado **Row Level Security (RLS)**. La clave pública de Supabase está en el navegador y cualquiera puede verla, así que la seguridad NO puede estar en el frontend. Con RLS, Postgres añade a cada consulta la condición `user_id = auth.uid()`: aunque alguien intente leer la tabla entera, solo recibe sus filas.
> - El **trigger** `on_auth_user_created` crea automáticamente el perfil (con un código de amigo aleatorio) cuando alguien se registra.
> - La función `can_view()` decide si puedes ver la rutina de otro según su privacidad y si sois amigos.

✅ Ves las 11 tablas en Table Editor.

---

## Paso 3 · Conectar la app a Supabase

1. En Supabase: **Project Settings → API** (o el botón **Connect**). Copia:
   - **Project URL**
   - **anon / publishable key** (la pública; nunca la `service_role`/secret)
2. En el proyecto, duplica `.env.example` y renómbralo a `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ... (o sb_publishable_...)
   ```
3. Para el servidor (`Ctrl + C`) y vuelve a lanzar `npm run dev`.

> **Por qué `.env`:** separa la configuración del código. Está en `.gitignore`, así que no se sube a GitHub. En Vercel se configuran las mismas variables en el panel.

✅ Ves la pantalla de **Inicia sesión**.

---

## Paso 4 · Registro e inicio de sesión

1. **Para pruebas**, en Supabase: **Authentication → Sign In / Providers → Email** desactiva **Confirm email** (así no tienes que confirmar el correo cada vez). Vuelve a activarlo antes de enseñar la app a otros.
2. En la app pulsa **Crear una cuenta**, pon nombre, correo y contraseña.
3. Comprueba en Supabase → **Authentication → Users** que aparece tu usuario, y en **Table Editor → profiles** tu perfil con su `friend_code`.

> **Cómo funciona (`src/components/Auth.jsx` y `src/App.jsx`)**
> - `supabase.auth.signUp()` crea el usuario. El nombre va en `options.data` y el trigger lo copia al perfil.
> - Supabase devuelve una **sesión** con un token **JWT** que se guarda en el navegador. Cada consulta lo envía y así Postgres sabe quién eres (`auth.uid()`).
> - `onAuthStateChange` avisa a la app cuando entras o sales y React cambia de pantalla.
> - "¿Has olvidado la contraseña?" envía un enlace; al volver, el evento `PASSWORD_RECOVERY` muestra el formulario de nueva contraseña.

✅ Entras a la app y ves "Hoy" con tu nombre.

---

## Paso 5 · Probar cada sección

Haz este recorrido y mira en **Table Editor** cómo aparecen las filas:

1. **Semana**: crea bloques (Universidad, Gimnasio, Estudio). Añade bloques a cada día. Prueba a solapar dos para ver el aviso. Copia el lunes al resto de días laborables.
2. **Gym**: añade ejercicios a hoy, edita un peso en la tabla (se guarda al salir del campo) y marca hoy como hecho.
3. **Nutrición**: rellena tus datos y registra una comida. Vuelve a la pestaña y úsala desde **Recientes**.
4. **Dinero**: pon saldo, invertido e ingreso. Ajusta el reparto hasta el 100 % y añade un gasto.
5. **Hoy**: comprueba que todo se resume ahí.

> **El código (`src/lib/hooks.js`)**
> Todas las páginas usan `useRows('tabla', { match: { user_id } })`, que hace un `SELECT` y devuelve `add`, `update` y `remove`. Por debajo, `supabase-js` llama a la **API REST** que Supabase genera sola:
> ```
> supabase.from('blocks').select('*')   →   GET /rest/v1/blocks?select=*
> supabase.from('blocks').insert({...}) →   POST /rest/v1/blocks
> ```
> No hay servidor propio: la base de datos + RLS hacen de backend.

✅ Cada acción crea, cambia o borra filas en las tablas.

---

## Paso 6 · Amigos

1. Abre la app en una ventana de incógnito y crea una segunda cuenta.
2. En Perfil de la cuenta 2, copia su código. En la cuenta 1, agrégalo.
3. En la cuenta 2, acepta la solicitud.
4. Pon la privacidad de la cuenta 2 en **Amigos** y crea algo en su semana.
5. Desde la cuenta 1, pulsa **Semana** junto a tu amigo.
6. Cambia la cuenta 2 a **Privada** y vuelve a mirar: ya no se ve. Eso lo bloquea la base de datos, no React.

✅ Ves la semana de tu amigo solo cuando su privacidad lo permite.

---

## Paso 7 · Subir a GitHub

Si el repositorio ya existe en tu cuenta, solo tienes que guardar cambios y subirlos:
```bash
git add .
git commit -m "Describe el cambio"
git push
```

Si partes del .zip:
1. En github.com → **New repository** → nombre `stoa`, **sin** README ni .gitignore.
2. En la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Stoa: primera versión"
   git branch -M main
   git remote add origin https://github.com/jerdier/stoa.git
   git push -u origin main
   ```

> **Conceptos:** un *commit* es una foto del proyecto con un mensaje; *push* la sube a GitHub. Haz commits pequeños y con mensajes claros: en una entrevista revisan tu historial.

✅ Ves el código en github.com/jerdier/stoa (sin `.env` ni `node_modules`).

---

## Paso 8 · Publicar en Vercel

1. vercel.com → **Add New → Project** → importa `stoa` desde GitHub.
2. Vercel detecta **Vite** solo. En **Environment Variables** añade las dos variables del `.env`.
3. **Deploy**. En un minuto tendrás una URL tipo `stoa-jerdier.vercel.app`.
4. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: tu URL de Vercel.
   - **Redirect URLs**: añade la URL de Vercel y `http://localhost:5173`.
   (Sin esto, los enlaces de confirmar correo y recuperar contraseña apuntarían a localhost.)

> **CI/CD:** desde ahora cada `git push` a `main` vuelve a desplegar la web automáticamente. Las ramas distintas de `main` generan una URL de previsualización.

✅ Abres la URL desde el móvil, inicias sesión y ves tus datos.

---

## Paso 9 · Instalar en el móvil (PWA)

- **Android / Chrome:** menú ⋮ → **Instalar app**.
- **iPhone / Safari:** compartir → **Añadir a pantalla de inicio**.

El icono y los colores vienen de `public/manifest.webmanifest`.

---

## Paso 10 · Dejarlo listo para el CV

1. Haz capturas de cada sección (escritorio y móvil), guárdalas en `docs/capturas/` y enlázalas en el README.
2. Pon la URL de Vercel en la descripción del repositorio (engranaje junto a "About").
3. Vuelve a activar **Confirm email** en Supabase.

**Cómo explicarlo en una entrevista:**
> "Es una SPA en React con Vite. El backend es Supabase: PostgreSQL con API REST generada y autenticación con JWT. La seguridad está en la base de datos con políticas Row Level Security, incluida una función que decide si un usuario puede ver la rutina de otro según su privacidad y la amistad. Se despliega en Vercel con integración continua desde GitHub."

---

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| Sigue saliendo "Falta conectar Supabase" | El archivo se llama `.env.example` en vez de `.env`, o no reiniciaste `npm run dev` |
| "Correo o contraseña incorrectos" nada más registrarte | Falta confirmar el correo (o desactiva "Confirm email" para pruebas) |
| Las listas salen vacías aunque hay datos | Revisa que ejecutaste el `schema.sql` entero (las políticas RLS) |
| En Vercel sale "Falta conectar Supabase" | No añadiste las variables en Vercel o falta un *Redeploy* tras añadirlas |
| El enlace del correo lleva a localhost | Configura Site URL en Supabase (paso 8.4) |

## Ideas para seguir

- **Edge Function** de Supabase que envíe un resumen semanal por correo (backend escrito por ti).
- Notificaciones push al empezar un bloque.
- Historial de pesos del gym con gráfica.
- Tests con Vitest para `lib/calc.js`.
