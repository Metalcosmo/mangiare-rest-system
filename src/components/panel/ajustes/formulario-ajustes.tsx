'use client'

import { Loader2, Save } from 'lucide-react'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { guardarAjustes, type EstadoAjustes } from '@/actions/ajustes'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Ajustes } from '@/lib/payload'

const ESTADO_INICIAL: EstadoAjustes = {}

const DIAS: Array<{ clave: string; etiqueta: string }> = [
  { clave: 'lunes', etiqueta: 'Lunes' },
  { clave: 'martes', etiqueta: 'Martes' },
  { clave: 'miercoles', etiqueta: 'Miércoles' },
  { clave: 'jueves', etiqueta: 'Jueves' },
  { clave: 'viernes', etiqueta: 'Viernes' },
  { clave: 'sabado', etiqueta: 'Sábado' },
  { clave: 'domingo', etiqueta: 'Domingo' },
]

const MONEDAS = [
  { label: 'Peso mexicano (MXN)', value: 'MXN' },
  { label: 'Peso colombiano (COP)', value: 'COP' },
  { label: 'Peso argentino (ARS)', value: 'ARS' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'Dólar (USD)', value: 'USD' },
  { label: 'Sol peruano (PEN)', value: 'PEN' },
  { label: 'Peso chileno (CLP)', value: 'CLP' },
]

function Campo({
  nombre,
  etiqueta,
  ayuda,
  children,
}: {
  nombre: string
  etiqueta: string
  ayuda?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )
}

export function FormularioAjustes({ ajustes }: { ajustes: Ajustes }) {
  const [estado, accion, pendiente] = useActionState(guardarAjustes, ESTADO_INICIAL)
  const [color, setColor] = useState(ajustes.colorPrimario ?? '#c2410c')

  const horarios = new Map(
    (ajustes.horarios ?? []).map((horario) => [horario.dia ?? '', horario]),
  )

  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje ?? 'Ajustes guardados')
  }, [estado])

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && (
        <Alert variant="destructive">
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidad y marca</CardTitle>
          <CardDescription>
            Así se ve el sistema para tu equipo y tus clientes. Es lo que hace white-label a la
            plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo nombre="nombreComercial" etiqueta="Nombre comercial">
            <Input
              id="nombreComercial"
              name="nombreComercial"
              defaultValue={ajustes.nombreComercial ?? ''}
              required
            />
          </Campo>

          <Campo nombre="eslogan" etiqueta="Eslogan">
            <Input id="eslogan" name="eslogan" defaultValue={ajustes.eslogan ?? ''} />
          </Campo>

          <Campo nombre="colorPrimario" etiqueta="Color primario">
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(evento) => setColor(evento.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border bg-transparent"
                aria-label="Selector de color"
              />
              <Input
                id="colorPrimario"
                name="colorPrimario"
                value={color}
                onChange={(evento) => setColor(evento.target.value)}
              />
            </div>
          </Campo>

          <Campo nombre="colorSecundario" etiqueta="Color de texto">
            <Input
              id="colorSecundario"
              name="colorSecundario"
              defaultValue={ajustes.colorSecundario ?? '#1c1917'}
            />
          </Campo>

          <Campo nombre="telefono" etiqueta="Teléfono">
            <Input id="telefono" name="telefono" defaultValue={ajustes.telefono ?? ''} />
          </Campo>

          <Campo nombre="email" etiqueta="Correo de contacto">
            <Input id="email" name="email" type="email" defaultValue={ajustes.email ?? ''} />
          </Campo>

          <Campo nombre="direccion" etiqueta="Dirección">
            <Input id="direccion" name="direccion" defaultValue={ajustes.direccion ?? ''} />
          </Campo>

          <Campo nombre="instagram" etiqueta="Instagram">
            <Input id="instagram" name="instagram" defaultValue={ajustes.instagram ?? ''} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operación, impuestos y propinas</CardTitle>
          <CardDescription>
            Estos valores alimentan el cálculo de totales del POS y de la carta pública.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo nombre="moneda" etiqueta="Moneda">
            <Select name="moneda" defaultValue={ajustes.moneda ?? 'MXN'}>
              <SelectTrigger id="moneda" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONEDAS.map((moneda) => (
                  <SelectItem key={moneda.value} value={moneda.value}>
                    {moneda.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo nombre="simboloMoneda" etiqueta="Símbolo de moneda">
            <Input
              id="simboloMoneda"
              name="simboloMoneda"
              defaultValue={ajustes.simboloMoneda ?? '$'}
            />
          </Campo>

          <Campo nombre="impuestoPorcentaje" etiqueta="% de impuesto">
            <Input
              id="impuestoPorcentaje"
              name="impuestoPorcentaje"
              type="number"
              step="0.01"
              min={0}
              defaultValue={ajustes.impuestoPorcentaje ?? 16}
            />
          </Campo>

          <Campo
            nombre="impuestoIncluido"
            etiqueta="Impuesto incluido en el precio"
            ayuda="Si está activo, los precios de la carta ya lo llevan y solo se desglosa."
          >
            <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <Checkbox
                id="impuestoIncluido"
                name="impuestoIncluido"
                defaultChecked={ajustes.impuestoIncluido !== false}
              />
              Los precios ya incluyen impuesto
            </label>
          </Campo>

          <Campo nombre="servicioPorcentaje" etiqueta="% de servicio">
            <Input
              id="servicioPorcentaje"
              name="servicioPorcentaje"
              type="number"
              step="0.01"
              min={0}
              defaultValue={ajustes.servicioPorcentaje ?? 0}
            />
          </Campo>

          <Campo
            nombre="propinasSugeridas"
            etiqueta="Propinas sugeridas (%)"
            ayuda="Sepáralas con comas, por ejemplo: 10, 15, 20"
          >
            <Input
              id="propinasSugeridas"
              name="propinasSugeridas"
              defaultValue={(ajustes.propinasSugeridas ?? [])
                .map((propina) => propina.valor ?? 0)
                .join(', ')}
            />
          </Campo>

          <Campo nombre="puntosPorUnidad" etiqueta="Puntos por unidad de moneda">
            <Input
              id="puntosPorUnidad"
              name="puntosPorUnidad"
              type="number"
              step="0.01"
              min={0}
              defaultValue={ajustes.puntosPorUnidad ?? 1}
            />
          </Campo>

          <Campo nombre="valorPunto" etiqueta="Valor de cada punto">
            <Input
              id="valorPunto"
              name="valorPunto"
              type="number"
              step="0.01"
              min={0}
              defaultValue={ajustes.valorPunto ?? 0.1}
            />
          </Campo>

          <Campo nombre="tiempoEstimadoMinutos" etiqueta="Tiempo de preparación (min)">
            <Input
              id="tiempoEstimadoMinutos"
              name="tiempoEstimadoMinutos"
              type="number"
              min={0}
              defaultValue={ajustes.tiempoEstimadoMinutos ?? 25}
            />
          </Campo>

          <Campo nombre="aforoMaximo" etiqueta="Aforo máximo">
            <Input
              id="aforoMaximo"
              name="aforoMaximo"
              type="number"
              min={0}
              defaultValue={ajustes.aforoMaximo ?? 80}
            />
          </Campo>

          <Campo
            nombre="aceptaPedidos"
            etiqueta="Recepción de pedidos"
            ayuda="Desactívalo al cerrar: la carta sigue visible pero no acepta pedidos."
          >
            <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <Checkbox
                id="aceptaPedidos"
                name="aceptaPedidos"
                defaultChecked={ajustes.aceptaPedidos !== false}
              />
              Aceptar pedidos en línea
            </label>
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horarios de atención</CardTitle>
          <CardDescription>Se muestran en la carta pública del cliente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {DIAS.map((dia) => {
            const horario = horarios.get(dia.clave)
            return (
              <div key={dia.clave} className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm font-medium">{dia.etiqueta}</span>
                <Input
                  name={`horario_${dia.clave}_abre`}
                  defaultValue={horario?.abre ?? '13:00'}
                  className="h-9 w-24"
                  aria-label={`Apertura ${dia.etiqueta}`}
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  name={`horario_${dia.clave}_cierra`}
                  defaultValue={horario?.cierra ?? '23:00'}
                  className="h-9 w-24"
                  aria-label={`Cierre ${dia.etiqueta}`}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    name={`horario_${dia.clave}_cerrado`}
                    defaultChecked={horario?.cerrado ?? false}
                  />
                  Cerrado
                </label>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Textos para el cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo nombre="mensajeBienvenida" etiqueta="Mensaje de bienvenida">
            <Textarea
              id="mensajeBienvenida"
              name="mensajeBienvenida"
              rows={3}
              defaultValue={ajustes.mensajeBienvenida ?? ''}
            />
          </Campo>

          <Campo
            nombre="notaServicio"
            etiqueta="Nota operativa"
            ayuda="Se muestra como aviso en la carta (por ejemplo, una demora)."
          >
            <Textarea
              id="notaServicio"
              name="notaServicio"
              rows={3}
              defaultValue={ajustes.notaServicio ?? ''}
            />
          </Campo>

          <Campo nombre="mensajePie" etiqueta="Mensaje al pie de la carta">
            <Input id="mensajePie" name="mensajePie" defaultValue={ajustes.mensajePie ?? ''} />
          </Campo>

          <Campo
            nombre="permitirPropinaCliente"
            etiqueta="Propina desde la carta"
            ayuda="Permite al cliente dejar propina al ordenar desde su mesa."
          >
            <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <Checkbox
                id="permitirPropinaCliente"
                name="permitirPropinaCliente"
                defaultChecked={ajustes.permitirPropinaCliente !== false}
              />
              Mostrar selección de propina
            </label>
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo nombre="encabezadoTicket" etiqueta="Encabezado del ticket">
            <Textarea
              id="encabezadoTicket"
              name="encabezadoTicket"
              rows={3}
              defaultValue={ajustes.encabezadoTicket ?? ''}
            />
          </Campo>
          <Campo nombre="pieTicket" etiqueta="Pie del ticket">
            <Textarea
              id="pieTicket"
              name="pieTicket"
              rows={3}
              defaultValue={ajustes.pieTicket ?? ''}
            />
          </Campo>
          <Campo nombre="identificacionFiscal" etiqueta="Identificación fiscal">
            <Input
              id="identificacionFiscal"
              name="identificacionFiscal"
              defaultValue={ajustes.identificacionFiscal ?? ''}
            />
          </Campo>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={pendiente} className="shadow-lg">
          {pendiente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar ajustes
        </Button>
      </div>
    </form>
  )
}
