'use client'

import {
  Loader2,
  Minus,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  UserCheck,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  agregarAlPedido,
  cambiarCantidadDelPedido,
  enviarPedidoDeMesa,
  quitarDelPedido,
} from '@/actions/borrador'
import { AutoRefresco } from '@/components/panel/auto-refresco'
import {
  DialogoModificadores,
  type ProductoPos,
} from '@/components/panel/pos/dialogo-modificadores'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { opcionesElegibles } from '@/lib/carta'
import { moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

type Categoria = {
  id: string | number
  nombre: string
  icono?: string | null
  descripcion?: string | null
}
type Mesa = {
  id: string | number
  nombre: string
  slug: string
  zona?: { nombre?: string } | null
  capacidad?: number | null
}

/** El catálogo público añade las etiquetas de la carta al producto del POS. */
export type ProductoCliente = ProductoPos & {
  etiquetasCarta?: string[]
  alergenos?: string[]
}

/** Una línea del pedido de la mesa, tal como la guarda el servidor. */
export type LineaPedido = {
  indice: number
  nombre: string
  cantidad: number
  precioUnitario: number
  modificadores: string[]
  notas: string | null
  subtotal: number
}

/** Una ronda ya enviada al mesero. */
export type RondaPedido = {
  id: string
  folio: string
  estado: string
  estadoTexto: string
  total: number
  items: LineaPedido[]
}

export type SesionCliente = {
  anfitrionNombre: string | null
  rol: 'anfitrion' | 'invitado'
}

const ETIQUETA_ETIQUETA: Record<string, string> = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_gluten: 'Sin gluten',
  sin_lactosa: 'Sin lactosa',
  picante: 'Picante',
  recomendado: 'Recomendado',
  nuevo: 'Nuevo',
}

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

export function MenuCliente({
  ajustes,
  mesa,
  sesion,
  rondas,
  borrador,
  categorias,
  productos,
}: {
  ajustes: Ajustes
  mesa: Mesa
  sesion: SesionCliente
  rondas: RondaPedido[]
  borrador: { total: number; items: LineaPedido[] }
  categorias: Categoria[]
  productos: ProductoCliente[]
}) {
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [productoOpciones, setProductoOpciones] = useState<ProductoCliente | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [propinaPct, setPropinaPct] = useState(0)
  const [telefono, setTelefono] = useState('')

  const [enviando, iniciarEnvio] = useTransition()
  const [guardando, iniciarGuardado] = useTransition()

  const esAnfitrion = sesion.rol === 'anfitrion'
  const articulos = borrador.items.reduce((suma, linea) => suma + linea.cantidad, 0)

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

  /** Cada cambio va al servidor: el pedido es de la mesa, no del teléfono. */
  const ejecutar = (tarea: () => Promise<{ error?: string; mensaje?: string }>) =>
    iniciarGuardado(async () => {
      const resultado = await tarea()
      if (resultado?.error) toast.error(resultado.error)
      else if (resultado?.mensaje) toast.success(resultado.mensaje)
    })

  /** Abre el pedido de la mesa al agregar, para confirmar que sí entró. */
  const agregar = (entrada: {
    producto: string | number
    cantidad: number
    modificadores?: Array<{ nombre: string; precioExtra: number }>
    notas?: string
  }) =>
    iniciarGuardado(async () => {
      const resultado = await agregarAlPedido(mesa.slug, entrada)
      if (resultado?.error) {
        toast.error(resultado.error)
        return
      }
      setCarritoAbierto(true)
    })

  const propina = redondear((borrador.total * propinaPct) / 100)

  const enviar = () => {
    iniciarEnvio(async () => {
      const resultado = await enviarPedidoDeMesa(mesa.slug, {
        telefono,
        propina,
      })
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado.mensaje ?? 'Pedido enviado.')
      setTelefono('')
      setPropinaPct(0)
      setCarritoAbierto(false)
    })
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Encabezado */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {mesa.nombre}
                {sesion.anfitrionNombre ? ` · ${sesion.anfitrionNombre}` : ''}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {esAnfitrion ? 'Anfitrión' : 'Invitado'}
                {mesa.zona?.nombre ? ` · ${mesa.zona.nombre}` : ''}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AutoRefresco intervalo={15000} />
            <Button
              variant="outline"
              className="relative"
              onClick={() => setCarritoAbierto(true)}
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">La mesa</span>
              {articulos > 0 && (
                <Badge className="absolute -right-2 -top-2 size-5 justify-center rounded-full p-0 text-[10px]">
                  {articulos}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4">
        <section className="py-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {ajustes.nombreComercial}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Todo lo que agregues va al pedido de la mesa.
            {esAnfitrion
              ? ' Cuando esté listo, mándalo al mesero.'
              : ' Sólo quien abrió la mesa puede mandarlo al mesero.'}
          </p>

          {!esAnfitrion && (
            <Alert className="mt-4">
              <AlertDescription className="flex items-center gap-2">
                <UserCheck className="size-4 shrink-0" />
                Puedes agregar y quitar platillos. Pídele al anfitrión que mande el pedido.
              </AlertDescription>
            </Alert>
          )}
        </section>

        {/* Buscador y categorías */}
        <div className="sticky top-[65px] z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar en la carta…"
              className="h-10 pl-9"
            />
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <Button
              size="sm"
              variant={categoriaActiva === 'todas' ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => setCategoriaActiva('todas')}
            >
              Todo
            </Button>
            {categorias.map((categoria) => (
              <Button
                key={String(categoria.id)}
                size="sm"
                variant={categoriaActiva === String(categoria.id) ? 'default' : 'outline'}
                className="shrink-0"
                onClick={() => setCategoriaActiva(String(categoria.id))}
              >
                {categoria.icono} {categoria.nombre}
              </Button>
            ))}
          </div>
        </div>

        {/* Platillos */}
        <section className="grid gap-3 py-5 sm:grid-cols-2">
          {productosFiltrados.length === 0 && (
            <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No encontramos platillos con esa búsqueda.
            </p>
          )}

          {productosFiltrados.map((producto) => (
            <article
              key={String(producto.id)}
              className="flex flex-col justify-between rounded-2xl border bg-card p-4 transition-colors"
            >
              <div>
                <h2 className="font-medium leading-snug">{producto.nombre}</h2>

                {producto.descripcion && (
                  <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">
                    {producto.descripcion}
                  </p>
                )}

                {(producto.etiquetasCarta ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(producto.etiquetasCarta ?? []).map((etiqueta) => (
                      <span
                        key={etiqueta}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {ETIQUETA_ETIQUETA[etiqueta] ?? etiqueta}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-base font-semibold text-primary">
                  {moneda(precioBase(producto), ajustes)}
                </span>
                <Button
                  size="sm"
                  disabled={guardando}
                  onClick={() =>
                    opcionesElegibles(producto) > 0
                      ? setProductoOpciones(producto)
                      : agregar({ producto: producto.id, cantidad: 1 })
                  }
                >
                  <Plus className="size-4" />
                  Agregar
                </Button>
              </div>
            </article>
          ))}
        </section>

        <footer className="border-t py-8 text-center text-xs text-muted-foreground">
          {ajustes.mensajePie ?? 'Gracias por tu visita'}
          {ajustes.telefono && <span className="mt-1 block">{ajustes.telefono}</span>}
        </footer>
      </main>

      {/* Barra inferior */}
      {articulos > 0 && !carritoAbierto && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {articulos} artículo{articulos === 1 ? '' : 's'} sin enviar
              </p>
              <p className="text-lg font-semibold">{moneda(borrador.total, ajustes)}</p>
            </div>
            <Button size="lg" onClick={() => setCarritoAbierto(true)}>
              <ShoppingBag className="size-4" />
              Ver el pedido
            </Button>
          </div>
        </div>
      )}

      {/* Pedido de la mesa */}
      <Sheet open={carritoAbierto} onOpenChange={setCarritoAbierto}>
        <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b px-5 py-4">
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>Pedido de la mesa</span>
              <span className="text-sm font-normal text-muted-foreground">{mesa.nombre}</span>
            </SheetTitle>
          </SheetHeader>

          {/* `min-h-0` es imprescindible: sin él un hijo flex-1 no baja de su
              altura de contenido, desborda el panel y empuja el botón de enviar
              fuera de la pantalla. */}
          <ScrollArea className="min-h-0 flex-1 px-5">
            <div className="flex flex-col gap-4 py-4">
              {rondas.length === 0 && borrador.items.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Todavía no han agregado nada.
                </p>
              )}

              {rondas.length > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ya enviado
                  </p>

                  {rondas.some((ronda) => ronda.estado === 'por_confirmar') && (
                    <Alert>
                      <AlertDescription className="text-xs">
                        Hay una ronda esperando que un mesero la confirme. Hasta entonces no pasa a
                        cocina.
                      </AlertDescription>
                    </Alert>
                  )}

                  {rondas.map((ronda) => (
                    <div key={ronda.id} className="rounded-xl border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {ronda.folio} · {ronda.estadoTexto}
                        </span>
                        <span className="text-sm font-semibold">
                          {moneda(ronda.total, ajustes)}
                        </span>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1">
                        {ronda.items.map((linea) => (
                          <li
                            key={`${ronda.id}-${linea.indice}`}
                            className="flex justify-between gap-3 text-xs text-muted-foreground"
                          >
                            <span className="min-w-0">
                              <span className="font-medium text-foreground">
                                {linea.cantidad}×
                              </span>{' '}
                              {linea.nombre}
                              {linea.modificadores.length > 0
                                ? ` · ${linea.modificadores.join(', ')}`
                                : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {borrador.items.length > 0 && (
                <section className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sin enviar
                  </p>

                  {borrador.items.map((linea) => (
                    <div key={linea.indice} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{linea.nombre}</p>
                          {linea.modificadores.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {linea.modificadores.join(' · ')}
                            </p>
                          )}
                          {linea.notas && (
                            <p className="text-xs italic text-muted-foreground">{linea.notas}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-semibold">
                          {moneda(linea.subtotal, ajustes)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            disabled={guardando}
                            onClick={() =>
                              ejecutar(() =>
                                cambiarCantidadDelPedido(mesa.slug, linea.indice, -1),
                              )
                            }
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-6 text-center">{linea.cantidad}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            disabled={guardando}
                            onClick={() =>
                              ejecutar(() =>
                                cambiarCantidadDelPedido(mesa.slug, linea.indice, 1),
                              )
                            }
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={guardando}
                          onClick={() =>
                            ejecutar(() => quitarDelPedido(mesa.slug, linea.indice))
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator className="my-1" />

                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{moneda(borrador.total, ajustes)}</span>
                    </div>
                    {esAnfitrion && propina > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Propina ({propinaPct}%)</span>
                        <span>{moneda(propina, ajustes)}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      El total de la mesa se cobra con el personal al terminar.
                    </p>
                  </div>
                </section>
              )}

              {esAnfitrion && borrador.items.length > 0 && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mesa-telefono" className="text-sm">
                      Teléfono (opcional, acumula puntos)
                    </Label>
                    <Input
                      id="mesa-telefono"
                      value={telefono}
                      onChange={(evento) => setTelefono(evento.target.value)}
                      placeholder="55 1234 5678"
                    />
                  </div>

                  {ajustes.permitirPropinaCliente !== false && (
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm">Propina</Label>
                      <div className="flex flex-wrap gap-2">
                        {[0, ...(ajustes.propinasSugeridas ?? []).map((p) => p.valor ?? 0)]
                          .filter((valor, indice, lista) => lista.indexOf(valor) === indice)
                          .slice(0, 4)
                          .map((valor) => (
                            <Button
                              key={valor}
                              type="button"
                              size="sm"
                              variant={propinaPct === valor ? 'default' : 'outline'}
                              onClick={() => setPropinaPct(valor)}
                            >
                              {valor === 0 ? 'Sin propina' : `${valor}%`}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {borrador.items.length > 0 && (
            <SheetFooter className="shrink-0 border-t px-5 py-4">
              <div className="flex w-full flex-col gap-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Sin enviar</span>
                  <span>{moneda(borrador.total, ajustes)}</span>
                </div>

                {esAnfitrion ? (
                  <Button size="lg" onClick={enviar} disabled={enviando || guardando}>
                    {enviando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {enviando ? 'Enviando…' : 'Enviar pedido al mesero'}
                  </Button>
                ) : (
                  <Alert>
                    <AlertDescription className={cn('text-xs')}>
                      Sólo quien abrió la mesa puede mandar el pedido al mesero.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <DialogoModificadores
        producto={productoOpciones}
        abierto={Boolean(productoOpciones)}
        onOpenChange={(valor) => !valor && setProductoOpciones(null)}
        ajustes={ajustes}
        onAgregar={(linea) =>
          agregar({
            producto: linea.producto.id,
            cantidad: linea.cantidad,
            modificadores: linea.modificadores,
            notas: linea.notas,
          })
        }
      />
    </div>
  )
}

export const precioBase = (producto: ProductoPos) => producto.precioPromocional ?? producto.precio ?? 0

export type { ProductoPos }
