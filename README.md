# Mangiare · Sistema de restaurante white-label

Plataforma completa de operación para restaurantes: carta digital con pedidos por código QR,
punto de venta, pantalla de cocina, inventario con recetas, personal, CRM con lealtad, marketing
y reservaciones con mapa de salón.

Todo el producto está en **español (es-MX)** y es **white-label**: el nombre, los colores y la
moneda se configuran desde el panel y se reflejan tanto en la operación como en la carta que ve
el cliente.

---

## Stack

| Pieza | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| CMS / API | Payload CMS 3.90 con Local API |
| Base de datos | Cloudflare D1 (SQLite) |
| Archivos | Cloudflare R2 |
| Despliegue | Cloudflare Workers vía OpenNext |
| UI | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Gráficas | Recharts (vía `chart` de shadcn) |
| Pruebas | Vitest (integración) y Playwright (e2e) |

---

## Arranque rápido

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno (copia y genera un secreto)
cp .env.example .env
openssl rand -hex 32   # pega el resultado en PAYLOAD_SECRET

# 3. Datos de ejemplo (crea el esquema local de D1 y siembra el demo)
pnpm seed

# 4. Desarrollo
pnpm dev
```

| Qué | Dónde |
| --- | --- |
| Panel de operación | <http://localhost:3000/panel> |
| Carta pública (portada) | <http://localhost:3000> |
| Carta de una mesa (QR) | `http://localhost:3000/mesa/<slug>` |
| Admin técnico de Payload | <http://localhost:3000/admin> |

### Accesos de ejemplo

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@mangiare.mx` | `mangiare123` |
| Gerente | `gerente@mangiare.mx` | `mangiare123` |
| Cajero | `cajera@mangiare.mx` | `mangiare123` |
| Mesero | `mesero@mangiare.mx` | `mangiare123` |
| Cocina | `cocina@mangiare.mx` | `mangiare123` |

> El `pnpm` del sistema debe ser **10.x** (`corepack pnpm@10 …`). El `pnpm-lock.yaml` está
> generado con pnpm 10 y `node_modules` enlaza con su store; con pnpm 11 `pnpm install` detecta
> un store distinto y su política `minimumReleaseAge` rechaza parte del árbol.

---

## Flujo del cliente (QR por mesa)

1. Cada mesa tiene un **slug** propio (`mesa-1`, `terraza-2`, `barra-3`…).
2. En **Panel → Mesas y QR** se genera e imprime el código QR de cada mesa, que apunta a
   `/mesa/<slug>`.
3. El primero que escanea **abre la mesa** con su **nombre y su cédula**: queda como *anfitrión*.
   Los demás entran escribiendo **la cédula del anfitrión**.
4. El pedido de la mesa es **uno solo y vive en el servidor**: anfitrión e invitados agregan,
   quitan y cambian cantidades, y todos los teléfonos ven lo mismo (se refresca solo cada 15 s).
5. **Sólo el anfitrión puede mandarlo al mesero.** Mientras no lo mande, el pedido está en
   `borrador`: no aparece en cocina ni en la cuenta. Al enviarlo pasa a `por_confirmar`.
6. Un mesero lo revisa desde **`/panel/mesero`**, ajusta lo que haga falta y lo **aprueba**; sólo
   entonces el pedido pasa a `nuevo`, entra al KDS y **descuenta los ingredientes de la receta**.
   Si lo rechaza, queda cancelado y el inventario nunca se toca.
7. Lo que la mesa agregue después de una aprobación forma una **ronda nueva**, que el anfitrión
   vuelve a mandar y un mesero vuelve a confirmar. La cuenta sigue siendo una sola.
8. Si deja su teléfono, se da de alta/actualiza solo en el CRM y acumula puntos al pagar.

> La compuerta de aprobación se controla en **Ajustes → El mesero confirma los pedidos de mesa**
> (activada por defecto). Con ella apagada, lo que manda el anfitrión va directo a cocina.
> Los pedidos que levanta el personal desde el POS **siempre** van directo a cocina.

### Cómo se identifica la mesa

- La sesión se guarda en la cookie `mg_mesa` (`<sesionId>.<token>`), `httpOnly` y 12 h. La carta
  no se abre sin ella: quien llega sin cookie ve la puerta de identidad.
- La sesión guarda **dos tokens distintos**, uno del anfitrión y uno de invitado. El rol nunca
  viaja en la cookie: se deduce comparando el token contra los dos secretos de la sesión. Si
  fuera una bandera, cualquiera podría leer su cookie (aunque sea `httpOnly`, se ve en las
  herramientas del navegador) y reemitirla como anfitrión.
- Una mesa ya abierta **no se puede abrir otra vez**: sólo se entra con la cédula. Si el mesero
  abre la mesa desde el POS (no conoce la cédula), el primer comensal que escanee el QR la
  **reclama** y queda como anfitrión.
- El **borrador** de la mesa no es un pedido: no lleva folio hasta que se envía, y si la mesa
  quita la última línea desaparece. El personal puede descartarlo desde el salón.

---

## Módulos

### 0. Sección del mesero
- `/panel/mesero` — el espacio de trabajo del piso, pensado para el teléfono: **cola de pedidos
  por confirmar** (revisar, aprobar o rechazar con motivo) y lista de mesas con filtros.
- Filtros en la URL (`?vista=&zona=&mesas=&q=`): **Todas · Mis mesas · Por confirmar · Mi
  selección · Libres · Ocupadas**, por zona, por nombre y eligiendo un subconjunto de mesas que se
  recuerda en el dispositivo.
- `/panel/mesero/[id]` — revisión de un pedido: ajustar cantidades, quitar o agregar platillos con
  sus modificadores, y **aprobar y enviar a cocina** en un solo paso.
- Desde cada mesa, **Tomar pedido** abre el POS con esa mesa ya elegida. Un mesero que inicia
  sesión aterriza aquí, y el badge de la navegación muestra cuántos pedidos esperan confirmación.

### 1. Punto de venta y pedidos omnichannel
- `/panel/pos` — terminal táctil: catálogo por categorías, modificadores, ticket, canal
  (**mesa / mostrador / para llevar**), descuentos, cupones, propina y cobro con pagos divididos.
- Las **cuentas abiertas** se agrupan **por mesa**: una tarjeta por mesa con su anfitrión, sus
  rondas y su total, más un aviso de lo que la mesa tiene sin enviar. Cobrar una mesa es **una
  sola operación**: los pagos se reparten entre sus rondas de forma proporcional y el residuo cae
  en la última, así que lo guardado cuadra al centavo con lo cobrado.
- `/panel/pedidos` — historial con filtros por rango, canal y estado.
- `/panel/pedidos/[id]` — detalle: líneas, totales, pagos, margen bruto, línea de tiempo e
  impresión de ticket.
- Los estados (`borrador → por_confirmar → nuevo → en_preparacion → listo → servido → pagado`)
  disparan solos las marcas de tiempo, el estado de la mesa y los puntos de lealtad.
- `por_confirmar` es el único estado que **no** consume inventario: espera la aprobación de un
  mesero. Un pedido en ese estado tampoco puede avanzar por `cambiarEstadoPedido`, sólo aprobarse
  o rechazarse.

### 1.b Salón y cuentas de mesa
- Cada sesión de mesa guarda quién la abrió, con qué cédula y en qué estado quedó; la cuenta, en
  cambio, es de la **mesa**: el salón, la sección del mesero y el POS suman todas sus rondas.
- La sesión se cierra sola cuando no le queda nada vivo (ni rondas activas ni borrador). Si algo
  se cobró, la mesa pasa a **por limpiar**; si sólo se canceló todo, la mesa sigue ocupada porque
  los comensales están ahí.
- Desde la hoja de una mesa en el salón se puede **descartar lo que la mesa tiene sin enviar**.

### 2. Pantalla de cocina (KDS)
- `/panel/kds` — tablero de tres columnas (nuevos / en preparación / listos) filtrable por
  **estación** (cocina, parrilla, barra, postres, mostrador).
- Temporizadores por comanda con semáforo de urgencia, modificadores y notas resaltadas,
  marcado por platillo o de la comanda completa, y auto-refresco cada 10 s.

### 3. Inventario y recetas
- `/panel/inventario` — existencias, valor del almacén, alertas de stock bajo y registro de
  entradas.
- `/panel/inventario/movimientos` — libro de entradas, salidas, ajustes, mermas y **consumo
  automático por venta**.
- `/panel/inventario/proveedores` — proveedores y condiciones de pago.
- **Recetas**: cada platillo declara sus ingredientes con cantidad y unidad; el sistema convierte
  unidades (g↔kg, ml↔l), calcula el **costo de la receta**, el **margen** y descuenta el
  inventario en cada venta (y lo devuelve si el pedido se cancela).

### 4. Personal y turnos
- `/panel/personal` — equipo con roles y accesos, más una vista semanal de turnos con cambios de
  estado, horas totales y costo estimado de nómina.
- Roles: `admin`, `gerente`, `cajero`, `mesero`, `cocina`. Cada uno ve sólo las secciones que le
  corresponden.

### 5. CRM, lealtad y marketing
- `/panel/clientes` — base de clientes con KPIs, filtros por nivel y etiqueta, ficha 360° con
  historial de pedidos y platillos favoritos.
- **Lealtad**: puntos por unidad de moneda, niveles (bronce → platino) calculados por gasto y
  frecuencia, catálogo de recompensas y canje desde la ficha del cliente.
- `/panel/marketing` — campañas (correo, SMS, WhatsApp, push) con estimación de audiencia por
  segmento, métricas de apertura/conversión e ingresos atribuidos, más cupones con control de usos.

### 6. Reservaciones y salón
- `/panel/salon` — mapa visual del piso: cada mesa se posiciona con coordenadas y se colorea por
  estado; muestra el pedido activo y permite cambiar el estado desde el mapa.
- `/panel/reservas` — agenda por día, asignación de mesa según capacidad, detección de conflictos
  de horario y cambios de estado (incluido *no se presentó*).
- `/panel/mesas` — CRUD de mesas y zonas, con generación, descarga e impresión de códigos QR.

### 7. Variaciones de platillos (tallas y extras)
- `/panel/carta/grupos` — gestión de los grupos de opciones **desde el panel**, sin pasar por el
  admin de Payload: crear, editar y borrar grupos y sus opciones, con el precio extra de cada una.
  El listado muestra cuánto puede encarecer cada grupo y en cuántos platillos se usa.
- Un grupo se asigna al platillo desde su editor (**Carta → platillo → Grupos de opciones**). Un
  platillo puede llevar varios: «Talla» (chica/mediana/grande) y «Extras» (queso extra, tocino) a
  la vez.
- **Dos tipos**: selección única (una talla, un término de cocción) y selección múltiple (varios
  extras, con un tope). Un grupo puede ser obligatorio: el cliente no puede pedir el platillo sin
  elegir.
- **Disponibilidad por opción**: desmarcar «Disponible» retira esa opción de la carta y del POS sin
  borrarla, para cuando se acaba un ingrediente.
- La variación elegida viaja con la línea del pedido y se ve en el KDS, el detalle, el ticket y el
  histórico de compras del cliente.
- **El precio de cada opción lo pone siempre el servidor**: se re-resuelve contra el catálogo al
  guardar el pedido, así que un cliente no puede rebajar los extras manipulando la petición.

### Configuración
- `/panel/ajustes` — identidad y colores de marca, moneda, impuestos, propinas sugeridas,
  programa de puntos, aforo, horarios y textos de la carta y del ticket.

---

## Arquitectura

```
src/
├── access/                 Control de acceso por rol (admin, gerente, cajero, mesero, cocina)
├── collections/            Colecciones de Payload (esquema y reglas de negocio)
├── globals/Ajustes.ts      Configuración white-label del restaurante
├── hooks/
│   ├── pedidos.ts          Folio, totales, inventario, lealtad y estado de mesas
│   ├── clientes.ts         Nivel y ticket promedio
│   └── productos.ts        Costo de receta con conversión de unidades
├── lib/
│   ├── payload.ts          Cliente de Payload y ajustes
│   ├── auth.ts / roles.ts  Sesión del panel y permisos por rol
│   ├── inventario.ts       Movimientos, consumo por receta y costeo
│   ├── pedidos.ts          Cálculo de subtotales, impuestos, descuentos y propinas
│   ├── unidades.ts         Conversión de unidades de inventario
│   ├── recursos.ts         Definiciones declarativas de los CRUD del panel
│   └── formato.ts          Moneda, fechas y números en es-MX
├── actions/                Server Actions (sesión, pedidos, CRUD, ajustes, módulos)
├── components/
│   ├── ui/                 shadcn/ui
│   ├── panel/              Shell, tablas, formularios y módulos del panel
│   └── carta/              Carta pública del cliente
├── app/
│   ├── (panel)/panel/      Panel propio (no es el admin de Payload)
│   ├── (frontend)/         Carta pública: / y /mesa/[slug]
│   ├── (payload)/          Admin técnico de Payload en /admin
│   └── globals.css         Tokens de Tailwind v4 y shadcn
└── seed/                   Datos de ejemplo del demo
```

**El panel propio vive en `/panel`** y está construido con shadcn/ui: no depende de la interfaz
de Payload. `/admin` sigue disponible como respaldo técnico para depurar datos, restringido a
`admin` y `gerente`.

### Notas de implementación

- **Slug de Payload**: en Payload 3.90 el tipo de campo `slug` no existe en la unión `Field`. Se
  usa el helper `slugField()` desde `src/lib/slug.ts`, que además normaliza acentos al español.
- **IDs numéricos**: las colecciones sobre D1 usan IDs enteros; `src/lib/ids.ts` conserva el tipo
  original al leer relaciones para que las escrituras validen.
- **Servidor de confianza**: la creación de pedidos desde la carta pública se valida por completo
  en el servidor (mesa, disponibilidad y precios) y se escribe con `overrideAccess: true`, porque
  el comensal no tiene usuario Payload. El resto de operaciones usan `overrideAccess: false` con el
  usuario de la sesión.

---

## Pruebas

```bash
pnpm test:int         # 55 pruebas: totales, unidades, lealtad, compuerta de aprobación,
                      # variaciones (tallas y extras) y D1 real
pnpm test:e2e         # Playwright: carta pública, carrito, cobro, mesero y pedido compartido
pnpm test:e2e:admin   # Suite aparte para el admin técnico de Payload
```

> **Pensado para equipos modestos.** Las suites corren con **un solo worker y un solo
> navegador**, sin trazas ni video, y el navegador arranca con el heap limitado. La suite del
> admin va separada porque la primera visita a `/admin` obliga a Next.js a compilar todo el panel
> de Payload de golpe. En una máquina de 8 GB conviene reiniciar `pnpm dev` antes de correr
> `test:e2e:admin`.
>
> Las pruebas de integración corren **en serie** (`fileParallelism: false`): cada archivo levanta
> su propia instancia de Payload contra la misma base local de D1 y en paralelo chocan dentro de
> miniflare.
>
> `test:e2e:admin` es la suite más pesada del repo. La primera visita a `/admin/collections/users`
> puede disparar el *OOM killer* cuando la memoria está justa (swap lleno): verás el navegador
> morir con `SIGTERM` y no un fallo de aserción. Cierra pestañas antes de correrla, o verifica el
> admin con `curl` sobre `/admin`, `/admin/globals/ajustes` y `/admin/collections/pedidos`.

---

## Despliegue en Cloudflare

```bash
# 1. Genera la migración cuando cambies el esquema
pnpm payload migrate:create <nombre>

# 2. Autentícate y despliega (aplica migraciones sobre D1 y publica el Worker)
pnpm wrangler login
pnpm run deploy
```

Los bindings (`D1`, `R2`) y el `PAYLOAD_SECRET` se configuran en `wrangler.jsonc` y en el panel
de Cloudflare. La carta pública y el KDS son operaciones de lectura intensiva: conviene habilitar
réplicas de lectura de D1 en producción.

### Limitaciones conocidas

- **Sin `sharp` en Workers**: las redimensiones de imagen no están disponibles; la colección
  `media` tiene `crop` y `focalPoint` desactivados.
- **GraphQL** no está garantizado en Workers; el producto usa la Local API y Server Actions.
- **Envío de campañas**: el módulo de marketing registra el envío y calcula la audiencia, pero no
  transmite correo/SMS; falta conectar el proveedor.
