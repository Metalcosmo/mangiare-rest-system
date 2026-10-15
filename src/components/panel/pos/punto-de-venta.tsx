'use client'

import {
  Banknote,
  Minus,
  Plus,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { crearPedido, type EstadoPedidoAccion } from '@/actions/pedidos'
import { DialogoCobro } from '@/components/panel/pos/dialogo-cobro'
import {
  DialogoModificadores,
  precioBase,
  precioLinea,
  type Linea,
  type ProductoPos,
} from '@/components/panel/pos/dialogo-modificadores'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { opcionesElegibles } from '@/lib/carta'
import { moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

type Categoria = { id: string | number; nombre: string; icono?: string | null }
type Mesa = {
  id: string | number
  nombre: string
  estado?: string | null
  capacidad?: number | null
  zona?: { nombre?: string } | string | number | null
}
export type CuentaAbierta = {
  /** Id de la sesión cuando es una mesa; id del pedido cuando va suelto. */
  id: string
  tipo: 'mesa' | 'pedido'
  folio: string
  estado: string
  total: number
  mesa: { id: string; nombre: string } | null
  /** Quien abrió la mesa desde el QR. */
  anfitrion: string | null
  /** Comandas ya enviadas que forman la cuenta. */
  rondas: number
  /** Platillos que la mesa tiene en el borrador, sin enviar. */
  sinEnviar: number
  items: Array<{ nombre: string; cantidad: number }>
}

const CANALES = [
  { valor: 'mesa', etiqueta: 'En mesa', icono: UtensilsCrossed },
  { valor: 'mostrador', etiqueta: 'Mostrador', icono: Store },
  { valor: 'para_llevar', etiqueta: 'Para llevar', icono: ShoppingBag },
] as const

const ESTADO_INICIAL: EstadoPedidoAccion = {}
const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

export function PuntoDeVenta({
  ajustes,
  productos,
  categorias,
  mesas,
  cuentasAbiertas,
  mesaInicial,
}: {
  ajustes: Ajustes
  productos: ProductoPos[]
  categorias: Categoria[]
  mesas: Mesa[]
  cuentasAbiertas: CuentaAbierta[]
  /** Mesa ya elegida, por ejemplo cuando el mesero llega desde «Tomar pedido». */
  mesaInicial?: string
}) {
  const router = useRouter()

  const mesaPreseleccionada = useMemo(
    () =>
      mesaInicial && mesas.some((mesa) => String(mesa.id) === mesaInicial) ? mesaInicial : '',
    [mesaInicial, mesas],
  )

  const [lineas, setLineas] = useState<Linea[]>([])
  const [canal, setCanal] = useState<(typeof CANALES)[number]['valor']>('mesa')
  const [mesaId, setMesaId] = useState<string>(mesaPreseleccionada)
  const [comensales, setComensales] = useState(1)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas')

  const [productoParaOpciones, setProductoParaOpciones] = useState<ProductoPos | null>(null)
  const [cobroAbierto, setCobroAbierto] = useState(false)
  const [pedidoACobrar, setPedidoACobrar] = useState<string | null>(null)
  const [mesaACobrar, setMesaACobrar] = useState<string | null>(null)
  const [folioACobrar, setFolioACobrar] = useState('')
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaAbierta | null>(null)

  const intencion = useRef<'cocina' | 'cobrar'>('cocina')
  const [estado, accion, pendiente] = useActionState(crearPedido, ESTADO_INICIAL)

  // Identidad estable: si cambia en cada render, el efecto de `DialogoCobro`
  // se vuelve a ejecutar y repite la notificación del cobro.
  const refrescar = useCallback(() => router.refresh(), [router])

  const limpiar = () => {
    setLineas([])
    setClienteNombre('')
    setClienteTelefono('')
    setNotas('')
    setDescuento(0)
    setComensales(1)
    // Si el mesero llegó desde una mesa concreta, conservamos esa mesa para la
    // siguiente ronda en lugar de obligarlo a elegirla otra vez.
    setMesaId(mesaPreseleccionada)
  }

  useEffect(() => {
    if (!estado.ok) return

    if (intencion.current === 'cobrar' && estado.pedidoId) {
      setPedidoACobrar(String(estado.pedidoId))
      setFolioACobrar(estado.folio ?? '')
      setCobroAbierto(true)
    } else {
      toast.success(`Pedido ${estado.folio ?? ''} enviado a cocina`)
      limpiar()
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  useEffect(() => {
    if (estado.error) toast.error(estado.error)
  }, [estado.error])

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return productos.filter((producto) => {
      const categoriaId =
        producto.categoria && typeof producto.categoria === 'object'
          ? String(producto.categoria.id)
          : String(producto.categoria ?? '')
      if (categoriaActiva !== 'todas' && categoriaId !== categoriaActiva) return false
      if (!termino) return true
      return (
        producto.nombre.toLowerCase().includes(termino) ||
        (producto.descripcion ?? '').toLowerCase().includes(termino)
      )
    })
  }, [productos, busqueda, categoriaActiva])

  const agregarLinea = (nueva: Omit<Linea, 'uid'>) => {
    setLineas((actuales) => {
      const firma = (linea: Omit<Linea, 'uid'>) =>
        `${linea.producto.id}|${linea.modificadores.map((m) => m.nombre).sort().join(',')}|${linea.notas}`

      const existente = actuales.findIndex((linea) => firma(linea) === firma(nueva))
      if (existente >= 0 && !nueva.notas) {
        return actuales.map((linea, posicion) =>
          posicion === existente ? { ...linea, cantidad: linea.cantidad + nueva.cantidad } : linea,
        )
      }
      return [...actuales, { ...nueva, uid: `${Date.now()}-${Math.random().toString(36).slice(2)}` }]
    })
  }

  const cambiarCantidad = (uid: string, delta: number) =>
    setLineas((actuales) =>
      actuales
        .map((linea) =>
          linea.uid === uid ? { ...linea, cantidad: linea.cantidad + delta } : linea,
        )
        .filter((linea) => linea.cantidad > 0),
    )

  const quitarLinea = (uid: string) =>
    setLineas((actuales) => actuales.filter((linea) => linea.uid !== uid))

  const subtotal = redondear(lineas.reduce((suma, linea) => suma + precioLinea(linea) * linea.cantidad, 0))
  const descuentoAplicado = redondear(Math.min(descuento, subtotal))
  const base = redondear(subtotal - descuentoAplicado)
  const tasa = (ajustes.impuestoPorcentaje ?? 0) / 100
  const impuesto = redondear(
    ajustes.impuestoIncluido !== false ? (tasa > 0 ? base - base / (1 + tasa) : 0) : base * tasa,
  )
  const total = redondear(ajustes.impuestoIncluido !== false ? base : base + impuesto)

  const itemsJson = JSON.stringify(
    lineas.map((linea) => ({
      producto: linea.producto.id,
      cantidad: linea.cantidad,
      modificadores: linea.modificadores,
      notas: linea.notas || undefined,
    })),
  )

  const mesaSeleccionada = mesas.find((mesa) => String(mesa.id) === mesaId)

  const enviar = (tipo: 'cocina' | 'cobrar') => {
    intencion.current = tipo
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Punto de venta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Levanta pedidos de mesa, mostrador y para llevar. El inventario y los puntos de lealtad
            se descuentan solos al cobrar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <ShoppingCart className="size-3.5" />
            {lineas.reduce((suma, linea) => suma + linea.cantidad, 0)} artículos
          </Badge>
          <Badge variant="secondary">{cuentasAbiertas.length} cuentas abiertas</Badge>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        {/* Catálogo */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar platillo por nombre o descripción…"
                  className="h-11 pl-9"
                />
              </div>

              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant={categoriaActiva === 'todas' ? 'default' : 'outline'}
                  onClick={() => setCategoriaActiva('todas')}
                >
                  Todo
                </Button>
                {categorias.map((categoria) => (
                  <Button
                    key={String(categoria.id)}
                    type="button"
                    size="sm"
                    variant={categoriaActiva === String(categoria.id) ? 'default' : 'outline'}
                    className="whitespace-nowrap"
                    onClick={() => setCategoriaActiva(String(categoria.id))}
                  >
                    {categoria.icono} {categoria.nombre}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {productosFiltrados.map((producto) => (
                <button
                  key={String(producto.id)}
                  type="button"
                  onClick={() =>
                    opcionesElegibles(producto) > 0
                      ? setProductoParaOpciones(producto)
                      : agregarLinea({
                          producto,
                          cantidad: 1,
                          modificadores: [],
                          notas: '',
                        })
                  }
                  className="flex min-h-[92px] flex-col justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
                >
                  <span className="line-clamp-2 text-sm font-medium">{producto.nombre}</span>
                  <span className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      {moneda(precioBase(producto), ajustes)}
                    </span>
                    {opcionesElegibles(producto) > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        opciones
                      </Badge>
                    )}
                  </span>
                </button>
              ))}

              {productosFiltrados.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No hay platillos que coincidan con la búsqueda.
                </p>
              )}
            </div>

            {/* Ticket */}
            <Card className="xl:hidden">
              <CardContent className="flex flex-col gap-4 p-4">
                <TicketContenido
                  lineas={lineas}
                  ajustes={ajustes}
                  subtotal={subtotal}
                  descuento={descuentoAplicado}
                  impuesto={impuesto}
                  total={total}
                  setDescuento={setDescuento}
                  cambiarCantidad={cambiarCantidad}
                  quitarLinea={quitarLinea}
                  canal={canal}
                  setCanal={setCanal}
                  mesas={mesas}
                  mesaId={mesaId}
                  setMesaId={setMesaId}
                  comensales={comensales}
                  setComensales={setComensales}
                  clienteNombre={clienteNombre}
                  setClienteNombre={setClienteNombre}
                  clienteTelefono={clienteTelefono}
                  setClienteTelefono={setClienteTelefono}
                  notas={notas}
                  setNotas={setNotas}
                  pendiente={pendiente}
                  enviar={enviar}
                  error={estado.error}
                />
              </CardContent>
            </Card>

          {/* Cuentas abiertas */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cuentas abiertas
            </h2>
            {cuentasAbiertas.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay cuentas abiertas en este momento.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {cuentasAbiertas.map((cuenta) => (
                  <button
                    // El id de una mesa es el de su sesión y el de un pedido suelto
                    // es el del pedido: pueden coincidir, así que la clave los separa.
                    key={`${cuenta.tipo}-${cuenta.id}`}
                    type="button"
                    onClick={() => {
                      setCuentaSeleccionada(cuenta)
                      setPedidoACobrar(cuenta.tipo === 'pedido' ? cuenta.id : null)
                      setMesaACobrar(cuenta.tipo === 'mesa' ? (cuenta.mesa?.id ?? null) : null)
                      setFolioACobrar(
                        cuenta.tipo === 'mesa'
                          ? [cuenta.mesa?.nombre, cuenta.anfitrion].filter(Boolean).join(' · ')
                          : cuenta.folio,
                      )
                      setCobroAbierto(true)
                    }}
                    className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary"
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-medium">
                        {cuenta.tipo === 'mesa' ? (cuenta.mesa?.nombre ?? 'Mesa') : cuenta.folio}
                      </span>
                      <span className="text-sm font-semibold">{moneda(cuenta.total, ajustes)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cuenta.anfitrion ? `${cuenta.anfitrion} · ` : ''}
                      {cuenta.tipo === 'mesa'
                        ? `${cuenta.rondas} ${cuenta.rondas === 1 ? 'ronda' : 'rondas'}`
                        : 'Sin mesa'}{' '}
                      · {cuenta.items.length} líneas
                    </span>
                    {cuenta.sinEnviar > 0 && (
                      <span className="text-xs font-medium text-amber-600">
                        {cuenta.sinEnviar} sin enviar al mesero
                      </span>
                    )}
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {cuenta.items.map((item) => `${item.cantidad}× ${item.nombre}`).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket fijo en escritorio */}
        <div className="hidden xl:block">
          <Card className="sticky top-24">
            <CardContent className="p-4">
              <form
                action={accion}
                onSubmit={(evento) => {
                  if (lineas.length === 0) {
                    evento.preventDefault()
                    toast.error('Agrega al menos un platillo.')
                  }
                }}
                className="flex flex-col gap-4"
              >
                <input type="hidden" name="items" value={itemsJson} />
                <input type="hidden" name="canal" value={canal} />
                <input type="hidden" name="mesa" value={canal === 'mesa' ? mesaId : ''} />
                <input type="hidden" name="comensales" value={comensales} />
                <input type="hidden" name="clienteNombre" value={clienteNombre} />
                <input type="hidden" name="clienteTelefono" value={clienteTelefono} />
                <input type="hidden" name="notas" value={notas} />
                <input type="hidden" name="descuento" value={descuentoAplicado} />
                <input type="hidden" name="propina" value={0} />

                <TicketContenido
                  lineas={lineas}
                  ajustes={ajustes}
                  subtotal={subtotal}
                  descuento={descuentoAplicado}
                  impuesto={impuesto}
                  total={total}
                  setDescuento={setDescuento}
                  cambiarCantidad={cambiarCantidad}
                  quitarLinea={quitarLinea}
                  canal={canal}
                  setCanal={setCanal}
                  mesas={mesas}
                  mesaId={mesaId}
                  setMesaId={setMesaId}
                  comensales={comensales}
                  setComensales={setComensales}
                  clienteNombre={clienteNombre}
                  setClienteNombre={setClienteNombre}
                  clienteTelefono={clienteTelefono}
                  setClienteTelefono={setClienteTelefono}
                  notas={notas}
                  setNotas={setNotas}
                  pendiente={pendiente}
                  enviar={enviar}
                  error={estado.error}
                />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <DialogoModificadores
        producto={productoParaOpciones}
        abierto={Boolean(productoParaOpciones)}
        onOpenChange={(valor) => !valor && setProductoParaOpciones(null)}
        ajustes={ajustes}
        onAgregar={agregarLinea}
      />

      <DialogoCobro
        abierto={cobroAbierto}
        onOpenChange={(valor) => {
          setCobroAbierto(valor)
          if (!valor) {
            setCuentaSeleccionada(null)
            if (mesaACobrar && intencion.current === 'cobrar') limpiar()
            setPedidoACobrar(null)
            setMesaACobrar(null)
          }
        }}
        pedidoId={pedidoACobrar}
        mesaId={mesaACobrar}
        folio={folioACobrar}
        total={
          cuentaSeleccionada
            ? cuentaSeleccionada.total
            : total
        }
        ajustes={ajustes}
        onCobrado={refrescar}
      />
    </div>
  )
}

type PropsTicket = {
  lineas: Linea[]
  ajustes: Ajustes
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  setDescuento: (valor: number) => void
  cambiarCantidad: (uid: string, delta: number) => void
  quitarLinea: (uid: string) => void
  canal: string
  setCanal: (valor: 'mesa' | 'mostrador' | 'para_llevar') => void
  mesas: Mesa[]
  mesaId: string
  setMesaId: (valor: string) => void
  comensales: number
  setComensales: (valor: number) => void
  clienteNombre: string
  setClienteNombre: (valor: string) => void
  clienteTelefono: string
  setClienteTelefono: (valor: string) => void
  notas: string
  setNotas: (valor: string) => void
  pendiente: boolean
  enviar: (tipo: 'cocina' | 'cobrar') => void
  error?: string
}

function TicketContenido({
  lineas,
  ajustes,
  subtotal,
  descuento,
  impuesto,
  total,
  setDescuento,
  cambiarCantidad,
  quitarLinea,
  canal,
  setCanal,
  mesas,
  mesaId,
  setMesaId,
  comensales,
  setComensales,
  clienteNombre,
  setClienteNombre,
  clienteTelefono,
  setClienteTelefono,
  notas,
  setNotas,
  pendiente,
  enviar,
  error,
}: PropsTicket) {
  const mesasDisponibles = mesas.filter(
    (mesa) => mesa.estado === 'libre' || mesa.estado === 'ocupada' || String(mesa.id) === mesaId,
  )

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-4" />
          Ticket
        </h2>
        {lineas.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {lineas.reduce((suma, linea) => suma + linea.cantidad, 0)} artículos
          </span>
        )}
      </div>

      <div className="flex gap-1 rounded-lg border p-1">
        {CANALES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => setCanal(opcion.valor)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              canal === opcion.valor
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <opcion.icono className="size-3.5" />
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {canal === 'mesa' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Mesa</Label>
            <select
              value={mesaId}
              onChange={(evento) => setMesaId(evento.target.value)}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Elegir mesa…</option>
              {mesasDisponibles.map((mesa) => (
                <option key={String(mesa.id)} value={String(mesa.id)}>
                  {mesa.nombre}
                  {mesa.estado === 'ocupada' ? ' (ocupada)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Comensales</Label>
            <Input
              type="number"
              min={1}
              value={comensales}
              onChange={(evento) => setComensales(Number(evento.target.value) || 1)}
              className="h-9"
            />
          </div>
        </div>
      )}

      <ScrollArea className="max-h-72">
        {lineas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Toca un platillo para agregarlo al ticket.
          </p>
        ) : (
          <div className="flex flex-col gap-2 pr-2">
            {lineas.map((linea) => (
              <div key={linea.uid} className="rounded-lg border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{linea.producto.nombre}</p>
                    {linea.modificadores.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">
                        {linea.modificadores.map((modificador) => modificador.nombre).join(' · ')}
                      </p>
                    )}
                    {linea.notas && (
                      <p className="truncate text-xs italic text-muted-foreground">{linea.notas}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {moneda(precioLinea(linea) * linea.cantidad, ajustes)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => cambiarCantidad(linea.uid, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{linea.cantidad}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => cambiarCantidad(linea.uid, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => quitarLinea(linea.uid)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Cliente</Label>
          <Input
            value={clienteNombre}
            onChange={(evento) => setClienteNombre(evento.target.value)}
            placeholder="Nombre"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Teléfono</Label>
          <Input
            value={clienteTelefono}
            onChange={(evento) => setClienteTelefono(evento.target.value)}
            placeholder="Para lealtad"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Notas del pedido</Label>
        <Textarea
          rows={2}
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          placeholder="Indicaciones generales"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Descuento</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={descuento || ''}
          onChange={(evento) => setDescuento(Number(evento.target.value) || 0)}
          className="h-9"
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{moneda(subtotal, ajustes)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-destructive">
            <span>Descuento</span>
            <span>-{moneda(descuento, ajustes)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Impuesto {ajustes.impuestoIncluido !== false ? '(incluido)' : ''}
          </span>
          <span>{moneda(impuesto, ajustes)}</span>
        </div>
        <div className="mt-1 flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{moneda(total, ajustes)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          variant="outline"
          disabled={pendiente || lineas.length === 0}
          onClick={() => enviar('cocina')}
        >
          <Send className="size-4" />
          Enviar a cocina
        </Button>
        <Button
          type="submit"
          disabled={pendiente || lineas.length === 0}
          onClick={() => enviar('cobrar')}
        >
          <Banknote className="size-4" />
          Cobrar ahora
        </Button>
      </div>

      {canal === 'mesa' && mesaId && (
        <p className="text-xs text-muted-foreground">
          Se abrirá una cuenta en {mesas.find((mesa) => String(mesa.id) === mesaId)?.nombre}.
        </p>
      )}
    </>
  )
}
