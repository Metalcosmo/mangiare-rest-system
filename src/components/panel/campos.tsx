'use client'

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
import { SIN_VALOR, type Campo, type MapaOpciones, type Opcion } from '@/lib/recursos'
import { cn } from '@/lib/utils'

export type { MapaOpciones, Opcion }

const comoTexto = (valor: unknown): string =>
  valor === null || valor === undefined ? '' : String(valor)

const comoLista = (valor: unknown): string[] => {
  if (Array.isArray(valor)) {
    return valor.map((item) =>
      item && typeof item === 'object' ? String((item as { id?: unknown }).id ?? '') : String(item),
    )
  }
  return valor === null || valor === undefined ? [] : [String(valor)]
}

const valorFecha = (valor: unknown, conHora?: boolean): string => {
  if (!valor) return ''
  const texto = String(valor)
  return conHora ? texto.slice(0, 16) : texto.slice(0, 10)
}

type Props = {
  campo: Campo
  valor?: unknown
  opciones: MapaOpciones
}

export function CampoFormulario({ campo, valor, opciones }: Props) {
  const id = `campo-${campo.nombre}`
  const ancho = campo.ancho === 'medio' ? 'sm:col-span-1' : 'sm:col-span-2'

  const envoltura = (contenido: React.ReactNode, paraCasilla = false) => (
    <div className={cn('flex flex-col gap-2', ancho)}>
      {paraCasilla ? (
        contenido
      ) : (
        <>
          <Label htmlFor={id} className="text-sm">
            {campo.etiqueta}
            {campo.requerido && <span className="ml-1 text-destructive">*</span>}
          </Label>
          {contenido}
          {campo.ayuda && <p className="text-xs text-muted-foreground">{campo.ayuda}</p>}
        </>
      )}
    </div>
  )

  switch (campo.tipo) {
    case 'booleano': {
      const marcado = valor === true || valor === 'true' || valor === 'on'
      return envoltura(
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent/40"
        >
          <Checkbox id={id} name={campo.nombre} defaultChecked={marcado} />
          <span className="font-medium">{campo.etiqueta}</span>
        </label>,
        true,
      )
    }

    case 'multiselect': {
      const seleccionados = comoLista(valor)
      return envoltura(
        <div className="flex flex-wrap gap-2">
          {campo.opciones.map((opcion) => (
            <label
              key={opcion.value}
              className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent/40 has-checked:border-primary has-checked:bg-primary/10"
            >
              <Checkbox
                name={campo.nombre}
                value={opcion.value}
                defaultChecked={seleccionados.includes(opcion.value)}
              />
              {opcion.label}
            </label>
          ))}
        </div>,
      )
    }

    case 'relacion': {
      const lista = comoLista(valor)

      if (campo.multiple) {
        const disponibles = opciones[campo.fuente] ?? []
        return envoltura(
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border p-2">
            {disponibles.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin opciones disponibles.</p>
            )}
            {disponibles.map((opcion) => (
              <label
                key={opcion.value}
                className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent/40 has-checked:border-primary has-checked:bg-primary/10"
              >
                <Checkbox
                  name={campo.nombre}
                  value={opcion.value}
                  defaultChecked={lista.includes(opcion.value)}
                />
                {opcion.label}
              </label>
            ))}
          </div>,
        )
      }

      const disponibles = opciones[campo.fuente] ?? []
      const actual = lista[0] ?? ''
      return envoltura(
        <Select name={campo.nombre} defaultValue={actual || undefined}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={campo.ayuda ? campo.etiqueta : 'Selecciona una opción'} />
          </SelectTrigger>
          <SelectContent>
            {!campo.requerido && <SelectItem value={SIN_VALOR}>Sin definir</SelectItem>}
            {disponibles.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )
    }

    case 'select': {
      const actual = comoTexto(valor)
      return envoltura(
        <Select name={campo.nombre} defaultValue={actual || undefined}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Selecciona una opción" />
          </SelectTrigger>
          <SelectContent>
            {!campo.requerido && <SelectItem value={SIN_VALOR}>Sin definir</SelectItem>}
            {campo.opciones.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )
    }

    case 'contrasena':
      return envoltura(
        <Input
          id={id}
          name={campo.nombre}
          type="password"
          autoComplete="new-password"
          defaultValue=""
          placeholder={campo.placeholder ?? '••••••••'}
        />,
      )

    case 'numero':
      return envoltura(
        <Input
          id={id}
          name={campo.nombre}
          type="number"
          min={campo.min}
          max={campo.max}
          step={campo.paso ?? 'any'}
          defaultValue={valor === null || valor === undefined ? '' : Number(valor)}
          placeholder={campo.placeholder}
        />,
      )

    case 'fecha':
      return envoltura(
        <Input
          id={id}
          name={campo.nombre}
          type={campo.conHora ? 'datetime-local' : 'date'}
          defaultValue={valorFecha(valor, campo.conHora)}
        />,
      )

    case 'textarea':
      return envoltura(
        <Textarea
          id={id}
          name={campo.nombre}
          rows={campo.filas ?? 3}
          defaultValue={comoTexto(valor)}
        />,
      )

    default:
      return envoltura(
        <Input
          id={id}
          name={campo.nombre}
          defaultValue={comoTexto(valor)}
          placeholder={campo.placeholder}
        />,
      )
  }
}
