# Pendientes

Backlog del sistema. Cada entrada describe el problema, el diseño propuesto, los criterios de
aceptación y los archivos que toca, para que se pueda retomar sin volver a investigar.

---

## 1. ~~Agregar líneas a un pedido existente~~ — resuelto por sesiones de mesa

**Prioridad:** — · **Estado:** descartado por diseño · **Actualizado:** 2026-10-15

Este punto pedía fusionar una segunda ronda dentro del *mismo* pedido para no partir la cuenta y
no repetir folio, con consumo de inventario por delta.

**Ya no aplica.** La cuenta se agrupa por **sesión de mesa** (`sesiones-mesa`): el salón, la
sección del mesero y el POS suman todas las rondas de la mesa, y el cobro se hace una sola vez
por mesa con `cobrarCuenta({ tipo: 'mesa' })` repartiendo los pagos entre rondas. Cada ronda
conserva su folio, que es lo que el KDS y la cocina necesitan para no perder trabajo ya iniciado.

El consumo por delta (agregar líneas a un pedido **ya aprobado**) queda descartado: la segunda
ronda nace como pedido nuevo en `borrador`, se manda desde la carta y se aprueba aparte, así que
el inventario se descuenta por ronda y las transiciones siguen siendo complementarias.

---

## 2. Límite de tiempo para confirmar (aplazado)

**Prioridad:** media · **Estado:** aplazado · **Detectado:** 2026-10-15

### Qué resuelve

Una mesa puede quedar **bloqueada**: si alguien abre la sesión con una cédula que los comensales
reales no conocen, nadie más entra hasta que el personal la libere. Hoy las válvulas son
manuales: rechazar la ronda (que cierra la sesión) o descartar el borrador.

### Diseño acordado (para retomarlo sin re-investigar)

Un solo interruptor, `Ajustes.minutosAprobacionMesa` (por defecto 15, `0` = sin límite):

1. Una ronda en `por_confirmar` más antigua que el límite se cancela
   (`motivoCancelacion: 'No confirmado por el mesero a tiempo'`) **y su sesión se cierra con
   ella**: los comensales deben abrir la mesa otra vez.
2. Una sesión abierta sin pedidos (o con todos cancelados) más antigua que el límite se barre.
3. La sesión con comida ya en cocina **no** se toca mientras siga activa.

**Dos detalles que hay que respetar al implementarlo:**

- **Un reloj por pedido no alcanza para una sesión sin pedidos.** El temporizador sólo corre
  cuando ya se mandó algo; quien abre la mesa y no manda nada la bloquearía para siempre. Por eso
  la regla 2 es imprescindible.
- **Cerrar la sesión de una mesa con comida en cocina no parte la cuenta**, porque la cuenta es
  la mesa y no la sesión. Es lo que hace segura la regla 1.

**Detalles de implementación:**

- Barrido perezoso (sin cron): al cargar `/mesa/[slug]`, `/panel/mesero`, `/panel/salon`,
  `/panel/pos` y al inicio de las acciones de la puerta y del borrador.
- Aprobar y guardar la revisión comprueban el vencimiento **ellos mismos** (no confían en el
  barrido): una vez vencida, la ronda se cancela y la aprobación se rechaza. Sin periodo de
  gracia, para que la respuesta sea la misma sin importar quién mire primero.
- **Agregar líneas no reinicia el reloj**: el tiempo corre desde `createdAt` de la ronda (y
  `abiertaEn` de la sesión), o un bromista mantiene viva una ronda agregando cualquier cosa cada
  14 minutos cada vez.

---

## 3. Hallazgos abiertos

- **Cocina no puede crear pedidos.** `operacionDiaria.create` no incluye el rol `cocina`
  ([access/index.ts:70](src/access/index.ts:70)), pero sí puede actualizarlos.
- **No se puede cancelar una línea suelta** de un pedido ya enviado.
- **`items` de un pedido no es editable después de crearlo** (POS ni panel), más allá del
  `estadoItem` del KDS y de la revisión previa a la aprobación.
- **`visitas` del CRM** cuenta una visita por mesa cobrada, no por comensal: si una mesa tiene
  tres rondas, se otorgan los puntos del total una sola vez por cliente, pero la métrica de
  visitas no distingue cuánta gente había.
- **Los slugs de mesa son adivinables** (`mesa-1`). El endurecimiento real es un token aleatorio
  por mesa en el QR, que invalidaría todos los códigos ya impresos.
- **Sólo el anfitrión puede editar un borrador ya mandado**: una vez enviada, la ronda la ajusta
  el mesero desde la revisión.

---
