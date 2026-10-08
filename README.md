# Sistema de Registro Halloween

Sistema de venta y control de acceso con boletos QR para eventos.

Se registra a un cliente (nombre, número de personas, monto pagado), el sistema genera **un código QR único por persona**, y en la puerta esos códigos se escanean con la cámara del celular. **Cada QR sirve una sola vez.**

- **Producción:** https://vercel.com/fernando-garzas-projects/v0-halloween-registration-system
- **Editor v0:** https://v0.app/chat/projects/Ud1YOuZwumL

---

## Tabla de contenido

- [Qué hace el sistema](#qué-hace-el-sistema)
- [Tecnologías](#tecnologías)
- [Requisitos previos](#requisitos-previos)
- [Levantar en local (paso a paso)](#levantar-en-local-paso-a-paso)
- [Desplegar a producción (Vercel)](#desplegar-a-producción-vercel)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Solución de problemas](#solución-de-problemas)
- [Sincronización con v0](#sincronización-con-v0)

---

## Qué hace el sistema

| Pantalla | Ruta | Para qué sirve |
|---|---|---|
| Login | `/auth/login` | Entrar con correo y contraseña |
| Panel | `/dashboard` | Estadísticas, lista de registros, actividad reciente, exportar/importar |
| Nuevo registro | `/register` | Capturar cliente, personas y monto |
| Detalle | `/registrations/[id]` | Ver los QR, descargar PDF/PNG, compartir por WhatsApp |
| Escáner | `/scan` | Validar boletos en la entrada (cámara o código manual) |

Al crear un registro el sistema genera:

1. Un **folio** con formato `HAL-20261031-0421`.
2. **Un código QR por persona**, con un hash único de 12 caracteres.
3. Un **PDF A4** con todos los QR (2 por fila, con paginación automática).
4. Un **PNG individual** descargable por persona.
5. Un **mensaje de WhatsApp** listo para enviar al cliente.
6. Un **CSV** de respaldo con todo el evento.

El panel se actualiza **en tiempo real**: mientras alguien escanea en la puerta, los contadores cambian solos en la otra pantalla.

---

## Tecnologías

| Capa | Qué se usa |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui (Radix) |
| Base de datos y auth | Supabase (Postgres + Auth + Realtime) |
| Generación de QR | `qrcode.react` (pantalla) y `qrcode` (PDF/PNG) |
| Invitaciones | imagen de fondo `public/image.png` + canvas (`lib/invitation.ts`) |
| Lectura de QR | `@zxing/browser` |
| PDF | `jspdf` |
| Hosting | Vercel |

---

## Requisitos previos

Antes de empezar necesitas:

1. **Node.js 18.18 o superior** (recomendado: 20 o 24).
   Verifica con `node -v`. Si no lo tienes, descárgalo de [nodejs.org](https://nodejs.org).

2. **pnpm** como gestor de paquetes.
   Verifica con `pnpm -v`. Si no lo tienes:
   ```bash
   npm install -g pnpm
   ```
   > El repo tiene `pnpm-lock.yaml` y `package-lock.json`. **Usa pnpm** — es el lockfile que se mantiene actualizado. Mezclar ambos gestores causa problemas.

3. **Una cuenta de Supabase** (gratis) en [supabase.com](https://supabase.com).

4. **Una cuenta de Vercel** (gratis) — sólo si vas a desplegar.

---

## Levantar en local (paso a paso)

### Paso 1 — Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd HalloweenTicketSystem
pnpm install
```

> No necesitas hacer nada más aquí. El archivo `pnpm-workspace.yaml` ya viene en el repo con los scripts de instalación autorizados (`@tailwindcss/oxide` y `sharp`); pnpm 10+ los bloquea por defecto y sin esa autorización `pnpm build` falla con `ERR_PNPM_IGNORED_BUILDS` antes de compilar.

### Paso 2 — Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Elige una contraseña para la base de datos y guárdala.
3. Espera 1-2 minutos a que termine de aprovisionarse.

### Paso 3 — Copiar las credenciales

En el panel de Supabase ve a **Project Settings → API** y copia dos cosas:

- **Project URL** → algo como `https://abcdefghijkl.supabase.co`
- **Project API keys → `anon` `public`** → una cadena larga que empieza con `eyJ...`

> ⚠️ Copia la clave **`anon public`**, NO la `service_role`. La `service_role` salta todas las reglas de seguridad y nunca debe salir del servidor.

### Paso 4 — Crear el archivo `.env.local`

En la raíz del proyecto crea un archivo llamado `.env.local` con este contenido, reemplazando los valores por los tuyos:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> El archivo `.env.local` está en `.gitignore`, así que **nunca se sube al repositorio**. Cada persona necesita crear el suyo.

### Paso 5 — Crear las tablas en la base de datos

En Supabase ve a **SQL Editor** y ejecuta los scripts de la carpeta `scripts/` **en este orden exacto**:

**5.1** — Primero habilita la extensión de criptografía (la usa la función que genera los hashes de los QR):

```sql
create extension if not exists pgcrypto with schema extensions;
```

**5.2** — Copia y ejecuta el contenido de cada archivo, uno por uno:

| Orden | Archivo | Qué crea |
|---|---|---|
| 1 | `scripts/001_create_tables.sql` | Tablas `registrations`, `qr_codes`, `audit_logs`, índices y reglas de seguridad (RLS) |
| 2 | `scripts/002_create_functions.sql` | Funciones para generar folios y hashes, y los triggers de auditoría |
| 3 | `scripts/003_update_qr_hash_function.sql` | Reemplaza la función de hash por una versión corta (12 caracteres) |
| 4 | `scripts/004_roles.sql` | Roles `admin` / `vendedor`, RLS por rol y email de quien crea cada registro |

> Los pasos 3 y 4 **sobrescriben** funciones/policies de los pasos anteriores. Es intencional — igual tienes que ejecutar todos, en orden.

### Paso 6 — Activar Realtime

Para que el panel se actualice solo cuando alguien escanea:

1. Ve a **Database → Replication** (o **Database → Publications** según la versión).
2. En la publicación `supabase_realtime`, activa estas tres tablas:
   - `registrations`
   - `qr_codes`
   - `audit_logs`

> Si te saltas este paso la app funciona igual, pero tendrás que recargar la página a mano para ver los cambios.

### Paso 7 — Crear tu usuario

**El sistema no tiene pantalla de registro** — sólo login. Los usuarios se crean a mano desde Supabase:

1. Ve a **Authentication → Users → Add user → Create new user**.
2. Escribe el correo y la contraseña.
3. **Marca la casilla "Auto Confirm User"**. Si no lo haces, Supabase esperará una confirmación por correo y no podrás entrar.

Repite para cada persona que vaya a usar el sistema (taquilla, puerta, etc.).

#### Asignar roles

Hay dos roles (se configuran con `scripts/004_roles.sql`):

| Rol | Puede |
|---|---|
| `admin` | Ver todos los boletos, cifras, logs, quién registró cada boleto (correo, día y hora) y escanear QR |
| `vendedor` | **Únicamente** registrar boletos (y ver los QR de lo que él mismo registró) |

- Todos los usuarios creados **antes** de correr `004_roles.sql` quedan como `admin`.
- Por defecto, un usuario sin rol se trata como `vendedor` (mínimo privilegio).
- Para asignar un rol, ejecuta en el **SQL Editor**:

```sql
select public.set_user_role('correo@ejemplo.com', 'vendedor');
-- o
select public.set_user_role('correo@ejemplo.com', 'admin');
```

### Paso 8 — Arrancar

```bash
pnpm dev
```

Abre http://localhost:3000. Te va a redirigir automáticamente a la pantalla de login. Entra con el usuario que creaste en el paso 7.

### Comandos disponibles

```bash
pnpm dev            # servidor de desarrollo en http://localhost:3000
pnpm build          # compilar para producción
pnpm start          # correr la versión compilada (requiere pnpm build antes)
pnpm lint           # revisar el código
npx tsc --noEmit    # revisar errores de tipos (el build NO los revisa, ver más abajo)
```

---

## Desplegar a producción (Vercel)

### Opción A — Desde el dashboard de Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Importa el repositorio de GitHub.
3. Vercel detecta Next.js solo; **no cambies nada** en la configuración de build.
4. Antes de dar "Deploy", abre **Environment Variables** y agrega las dos:

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | La URL de tu proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave `anon public` |

   Márcalas para los tres entornos: **Production**, **Preview** y **Development**.

5. Haz clic en **Deploy**.

### Opción B — Desde la terminal

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### Después de desplegar

**1. Configura las URLs de autenticación en Supabase.**
Ve a **Authentication → URL Configuration** y pon tu dominio de Vercel en **Site URL** (por ejemplo `https://tu-proyecto.vercel.app`). Agrega también los dominios de preview en **Redirect URLs** si los usas.

**2. Usa la misma base de datos o crea otra.**
Si quieres que producción y desarrollo no compartan datos, crea un **segundo proyecto de Supabase** para producción, ejecuta ahí los mismos scripts SQL, y usa esas credenciales en las variables de Vercel.

**3. Verifica HTTPS.**
El escáner de QR necesita acceso a la cámara, y los navegadores **sólo lo permiten en HTTPS** (o en `localhost`). Vercel da HTTPS automáticamente, así que esto funciona sin configuración extra.

> ℹ️ Si conectas la integración oficial de Supabase en Vercel, ésta inyecta muchas variables (`SUPABASE_URL`, `POSTGRES_URL`, `SUPABASE_JWT_SECRET`, etc.). **Este proyecto no usa ninguna de ésas** — sólo las dos con prefijo `NEXT_PUBLIC_`. Asegúrate de que existan con ese nombre exacto.

---

## Variables de entorno

El proyecto usa **exactamente dos** variables. Las dos son públicas (el prefijo `NEXT_PUBLIC_` significa que se incluyen en el código que llega al navegador).

| Variable | Obligatoria | Dónde obtenerla | Para qué |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Supabase → Project Settings → API → Project URL | Dirección de tu base de datos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Supabase → Project Settings → API → `anon public` | Clave de acceso público |

**Sobre la seguridad:** que la clave `anon` sea pública es normal y esperado en Supabase. La protección real viene de las políticas **RLS (Row Level Security)** definidas en `scripts/001_create_tables.sql`, que sólo permiten leer y escribir a usuarios autenticados. Este proyecto **no usa `service_role`** en ningún lado.

> ⚠️ Con las reglas actuales, **cualquier usuario autenticado puede ver, editar y borrar todos los registros**. No hay separación de roles entre "taquilla" y "puerta". Si lo necesitas, hay que ajustar las políticas RLS.

### Plantilla

```bash
# .env.local — Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> Si quieres versionar un `.env.example` para tu equipo, ten en cuenta que `.gitignore` ignora todo `.env*`. Tendrías que agregarle una excepción: `!.env.example`

---

## Base de datos

### Tablas

**`registrations`** — un renglón por venta

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Llave primaria |
| `folio` | text | Único, formato `HAL-YYYYMMDD-XXXX` |
| `client_name` | text | Nombre del cliente |
| `person_count` | integer | Cuántas personas (mínimo 1) |
| `amount_paid` | numeric | Monto pagado |
| `created_by` | uuid | Quién lo registró |
| `created_at` / `updated_at` | timestamptz | Fechas |

**`qr_codes`** — un renglón por persona

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Llave primaria |
| `registration_id` | uuid | A qué registro pertenece |
| `qr_hash` | text | Único, 12 caracteres en mayúsculas |
| `person_number` | integer | 1, 2, 3… dentro del registro |
| `is_used` | boolean | Si ya entró |
| `used_at` / `used_by` | — | Cuándo y quién lo validó |

**`audit_logs`** — bitácora automática

Se llena sola mediante triggers. Guarda cada INSERT, UPDATE y DELETE sobre `registrations` y `qr_codes`, con los datos antes y después en formato JSON. Es lo que alimenta el panel de "Actividad Reciente".

### Funciones

| Función | Qué hace |
|---|---|
| `generate_folio()` | Genera `HAL-YYYYMMDD-XXXX` y reintenta hasta que sea único |
| `generate_qr_hash(id, persona)` | SHA-256 de registro + persona + timestamp, recortado a 12 caracteres |
| `log_audit()` | Trigger que escribe en `audit_logs` |
| `update_updated_at_column()` | Trigger que actualiza `updated_at` |

### Sobre las migraciones

**No hay sistema de migraciones automáticas.** Los scripts se ejecutan a mano en el SQL Editor de Supabase. Si agregas uno nuevo, nómbralo con el siguiente número (`004_...`) y documenta aquí que hay que correrlo.

---

## Estructura del proyecto

```
├── app/
│   ├── api/
│   │   ├── registrations/   POST crea registro + genera los QR · GET lista
│   │   ├── scan/            POST valida un QR y lo marca como usado
│   │   ├── stats/           GET totales del panel
│   │   ├── export/          GET descarga el CSV
│   │   ├── import/          POST sube un CSV para marcar QR usados
│   │   └── audit-logs/      GET últimos 20 eventos
│   ├── auth/                login, signout, error
│   ├── dashboard/           panel principal
│   ├── register/            formulario de nuevo registro
│   ├── registrations/[id]/  detalle con los QR
│   └── scan/                escáner
├── components/
│   ├── qr-scanner.tsx       cámara (@zxing) + entrada manual
│   ├── qr-code-display.tsx  invitaciones en pantalla, PDF, PNG, WhatsApp
│   ├── invitation-ticket.tsx boleto con imagen de fondo (vista web)
│   ├── registration-form.tsx
│   ├── dashboard-stats.tsx  tarjetas de totales (tiempo real)
│   ├── registrations-list.tsx
│   ├── recent-activity.tsx
│   ├── export-import-tools.tsx
│   └── ui/                  componentes de shadcn/ui
├── lib/
│   ├── supabase/            clientes de navegador, servidor y middleware
│   ├── auth.ts              helpers de rol (admin / vendedor)
│   ├── invitation.ts        render del boleto con imagen de fondo (PDF/PNG)
│   └── types.ts             tipos de TypeScript
├── scripts/                 los SQL que hay que correr en Supabase
└── middleware.ts            protege todas las rutas salvo /auth/*
```

### Cómo funciona la protección de rutas

`middleware.ts` intercepta **todas** las peticiones excepto `/auth/*` y archivos estáticos. Si no hay sesión, redirige a `/auth/login`. Además, cada página verifica la sesión otra vez en el servidor, y cada ruta de API responde `401` si no hay usuario.

Los roles se verifican en tres capas: el middleware y las páginas redirigen al vendedor fuera de las zonas de admin (`/scan`), las APIs de admin responden `403`, y las políticas RLS de Postgres filtran los datos (el vendedor sólo puede leer los registros que él mismo creó).

---

## Solución de problemas

**Me quedo en un ciclo infinito hacia `/auth/login`**
El usuario no está confirmado. En Supabase → Authentication → Users, revisa que la columna de confirmación tenga fecha. Si no, borra el usuario y vuelve a crearlo con "Auto Confirm User" activado.

**"Failed to generate folio" al crear un registro**
No corriste `scripts/002_create_functions.sql`, o falló. Vuelve a ejecutarlo en el SQL Editor y revisa el mensaje de error.

**Error de `digest()` o `function digest does not exist`**
Falta la extensión `pgcrypto`. Ejecuta:
```sql
create extension if not exists pgcrypto with schema extensions;
```
y vuelve a correr `002` y `003`.

**La cámara del escáner se queda en negro o no abre**
- Revisa que estés en **HTTPS** o en `localhost` — los navegadores no dan acceso a la cámara en HTTP.
- Revisa los permisos del navegador para el sitio.
- Si hay varias cámaras, usa el selector que aparece arriba a la izquierda del modal.
- Como respaldo siempre está la **entrada manual** de código.

**El panel no se actualiza solo**
Falta activar Realtime (paso 6). Recargar la página siempre funciona mientras tanto.

**Los contadores salen en cero aunque hay registros**
Las variables de entorno no están llegando. Después de crear o cambiar `.env.local` hay que **reiniciar `pnpm dev`** — Next.js sólo las lee al arrancar.

**Exporté un CSV y al importarlo no actualiza nada**
Es un problema conocido: `/api/export` escribe con separador `;` y los valores `SI`/`NO`, pero `/api/import` espera comas y `TRUE`. Los formatos no coinciden todavía.

**`pnpm build` falla con `ERR_PNPM_IGNORED_BUILDS`**
Falta o se modificó el `pnpm-workspace.yaml`, que es donde se autorizan los scripts de instalación. Restáuralo desde el repo, o corre `pnpm approve-builds` y marca `@tailwindcss/oxide` y `sharp`. El error aparece antes de compilar, así que no tiene que ver con tu código.

**Aparece un warning de `@supabase/realtime-js` durante el build**
`Critical dependency: the request of a dependency is an expression`. Es un aviso conocido de esa librería con webpack, no rompe nada y el build termina bien. Se puede ignorar.

**El build pasa pero algo truena en runtime**
`next.config.mjs` tiene `typescript.ignoreBuildErrors: true` y `eslint.ignoreDuringBuilds: true`, así que el build **no falla** aunque haya errores de tipos. Para revisarlos de verdad:
```bash
npx tsc --noEmit
```

---

## Sincronización con v0

Este repositorio está enlazado con [v0.app](https://v0.app). Los cambios que hagas desde la interfaz de v0 se empujan automáticamente a este repositorio, y Vercel despliega la última versión.

**Ojo:** si editas el código a mano en tu máquina y también desde v0, puedes tener conflictos. Decide un solo flujo de trabajo para evitar que v0 sobrescriba cambios locales.
