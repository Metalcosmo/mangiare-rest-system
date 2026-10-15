'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { alternarCampo } from '@/actions/crud'
import { BotonEliminar } from '@/components/panel/boton-eliminar'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { iniciales, moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'
import { etiquetaRol } from '@/lib/personal'
import type { MapaOpciones } from '@/lib/recursos'

export type FilaEmpleado = {
  id: string | number
  nombre: string
  apellidos?: string | null
  email: string
  rol?: string | null
  puesto?: string | null
  tarifaHora?: number | null
  activo?: boolean | null
}

const TONO_ROL: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  gerente: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  cajero: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  mesero: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  cocina: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
}

/** Listado del equipo con avatar, rol, tarifa y switch de activo. */
export function ListaEmpleados({
  empleados,
  opciones,
  ajustes,
}: {
  empleados: FilaEmpleado[]
  opciones: MapaOpciones
  ajustes: Ajustes
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [cambiando, setCambiando] = useState<string | null>(null)

  const alternarActivo = (empleado: FilaEmpleado, valor: boolean) => {
    setCambiando(String(empleado.id))
    iniciar(async () => {
      const resultado = await alternarCampo(
        'empleados',
        String(empleado.id),
        'activo',
        valor,
      )
      setCambiando(null)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(
        valor
          ? `${empleado.nombre} puede volver a entrar al panel.`
          : `Se suspendió el acceso de ${empleado.nombre}.`,
      )
      router.refresh()
    })
  }

  if (empleados.length === 0) {
    return (
      <EstadoVacio
        titulo="Aún no hay empleados"
        descripcion="Da de alta a tu equipo para asignarles turnos y accesos al panel."
      >
        <DialogoRegistro
          recurso="empleados"
          opciones={opciones}
          etiqueta="Nuevo empleado"
        />
      </EstadoVacio>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Empleado</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Puesto</TableHead>
            <TableHead className="text-right">Tarifa por hora</TableHead>
            <TableHead>Acceso</TableHead>
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map((empleado) => {
            const completo = [empleado.nombre, empleado.apellidos].filter(Boolean).join(' ')
            return (
              <TableRow key={String(empleado.id)}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 font-medium text-primary">
                        {iniciales(completo)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{completo || empleado.email}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {empleado.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      TONO_ROL[empleado.rol ?? ''] ??
                      'bg-muted text-muted-foreground'
                    }
                  >
                    {etiquetaRol(empleado.rol)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{empleado.puesto || '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {moneda(Number(empleado.tarifaHora ?? 0), ajustes)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(empleado.activo)}
                      disabled={pendiente && cambiando === String(empleado.id)}
                      onCheckedChange={(valor) => alternarActivo(empleado, valor)}
                      aria-label={`Acceso de ${completo || empleado.email}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {empleado.activo ? 'Activo' : 'Suspendido'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DialogoRegistro
                      recurso="empleados"
                      id={String(empleado.id)}
                      valores={{ ...empleado }}
                      opciones={opciones}
                      variante="editar"
                    />
                    <BotonEliminar
                      recurso="empleados"
                      id={String(empleado.id)}
                      nombre={completo || empleado.email}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
