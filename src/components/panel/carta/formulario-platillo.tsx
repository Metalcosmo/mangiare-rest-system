'use client'

/**
 * Formulario del editor de platillos (alta y edición).
 *
 * Reutiliza `CampoFormulario` para los campos simples y monta el
 * `EditorReceta` para la receta y su costo. Envía todo con la server action
 * `guardarPlatillo`.
 */

import { ArrowLeft, Loader2, Plus, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { guardarPlatillo } from '@/actions/carta'
import type { EstadoAccion } from '@/actions/crud'
import { CampoFormulario } from '@/components/panel/campos'
import { EditorReceta, type IngredienteReceta, type LineaRecetaInicial } from '@/components/panel/carta/editor-receta'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Ajustes } from '@/lib/payload'
import type { Campo, MapaOpciones, Opcion } from '@/lib/recursos'

const ESTADO_INICIAL: EstadoAccion = {}

const OPCIONES_ESTACION: Opcion[] = [
  { label: 'Cocina', value: 'cocina' },
  { label: 'Parrilla', value: 'parrilla' },
  { label: 'Barra', value: 'barra' },
  { label: 'Postres', value: 'postres' },
  { label: 'Mostrador', value: 'mostrador' },
]

const OPCIONES_ETIQUETAS: Opcion[] = [
  { label: 'Vegetariano', value: 'vegetariano' },
  { label: 'Vegano', value: 'vegano' },
  { label: 'Sin gluten', value: 'sin_gluten' },
  { label: 'Sin lactosa', value: 'sin_lactosa' },
  { label: 'Picante', value: 'picante' },
  { label: 'Recomendado', value: 'recomendado' },
  { label: 'Nuevo', value: 'nuevo' },
]

const OPCIONES_ALERGENOS: Opcion[] = [
  { label: 'Gluten', value: 'gluten' },
  { label: 'Lácteos', value: 'lacteos' },
  { label: 'Huevo', value: 'huevo' },
  { label: 'Frutos secos', value: 'frutos_secos' },
  { label: 'Mariscos', value: 'mariscos' },
  { label: 'Pescado', value: 'pescado' },
  { label: 'Soya', value: 'soya' },
]

const aLineaInicial = (valor: unknown): LineaRecetaInicial[] =>
  Array.isArray(valor) ? (valor as LineaRecetaInicial[]) : []

export function FormularioPlatillo({
  id = null,
  valores = {},
  opciones,
  grupos,
  ingredientes,
  ajustes,
}: {
  id?: string | null
  valores?: Record<string, unknown>
  opciones: MapaOpciones
  grupos: Opcion[]
  ingredientes: IngredienteReceta[]
  ajustes?: Ajustes | null
}) {
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState(
    (previo: EstadoAccion, formData: FormData) => guardarPlatillo(previo, id, formData),
    ESTADO_INICIAL,
  )

  useEffect(() => {
    if (!estado.ok) return
    toast.success(estado.mensaje ?? 'Platillo guardado.')
    router.push('/panel/carta')
    router.refresh()
  }, [estado, router])

  const campos = useMemo<Campo[]>(
    () => [
      { nombre: 'nombre', etiqueta: 'Nombre del platillo', tipo: 'texto', requerido: true },
      {
        nombre: 'descripcion',
        etiqueta: 'Descripción para el cliente',
        tipo: 'textarea',
        filas: 2,
      },
      {
        nombre: 'categoria',
        etiqueta: 'Categoría',
        tipo: 'relacion',
        fuente: 'categorias',
        requerido: true,
        ancho: 'medio',
      },
      {
        nombre: 'estacion',
        etiqueta: 'Estación de preparación',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: OPCIONES_ESTACION,
      },
      {
        nombre: 'precio',
        etiqueta: 'Precio de venta',
        tipo: 'numero',
        requerido: true,
        ancho: 'medio',
        min: 0,
        paso: 0.01,
      },
      {
        nombre: 'precioPromocional',
        etiqueta: 'Precio promocional',
        tipo: 'numero',
        ancho: 'medio',
        min: 0,
        paso: 0.01,
      },
      {
        nombre: 'tiempoPreparacion',
        etiqueta: 'Minutos de preparación',
        tipo: 'numero',
        ancho: 'medio',
        min: 0,
      },
      { nombre: 'sku', etiqueta: 'Código interno (SKU)', tipo: 'texto', ancho: 'medio' },
      {
        nombre: 'etiquetas',
        etiqueta: 'Etiquetas',
        tipo: 'multiselect',
        opciones: OPCIONES_ETIQUETAS,
      },
      {
        nombre: 'alergenos',
        etiqueta: 'Alérgenos',
        tipo: 'multiselect',
        opciones: OPCIONES_ALERGENOS,
      },
      {
        nombre: 'gruposModificadores',
        etiqueta: 'Grupos de opciones',
        tipo: 'multiselect',
        opciones: grupos,
        ayuda:
          grupos.length === 0
            ? 'Aún no hay grupos en el sistema. Créalos desde "Opciones y modificadores".'
            : 'Ej. talla (chica/mediana/grande), extras o término de cocción.',
      },
      { nombre: 'disponible', etiqueta: 'Disponible en la carta', tipo: 'booleano', ancho: 'medio' },
      { nombre: 'destacado', etiqueta: 'Destacado', tipo: 'booleano', ancho: 'medio' },
      {
        nombre: 'controlaStock',
        etiqueta: 'Descontar ingredientes del inventario al vender',
        tipo: 'booleano',
      },
      {
        nombre: 'rendimiento',
        etiqueta: 'Porciones que rinde',
        tipo: 'numero',
        ancho: 'medio',
        min: 1,
      },
    ],
    [grupos],
  )

  const porNombre = useMemo(() => new Map(campos.map((campo) => [campo.nombre, campo])), [campos])

  const bloque = (nombres: string[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {nombres.flatMap((nombre) => {
        const campo = porNombre.get(nombre)
        if (!campo) return []
        return [
          <CampoFormulario
            key={campo.nombre}
            campo={campo}
            valor={valores[campo.nombre]}
            opciones={opciones}
          />,
        ]
      })}
    </div>
  )

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && (
        <Alert variant="destructive">
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle>Información del platillo</CardTitle>
          <CardDescription>Nombre, clasificación, precio y tiempos de servicio.</CardDescription>
        </CardHeader>
        <CardContent>
          {bloque([
            'nombre',
            'descripcion',
            'categoria',
            'estacion',
            'precio',
            'precioPromocional',
            'tiempoPreparacion',
            'sku',
          ])}
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle>Etiquetas y opciones</CardTitle>
          <CardDescription>
            Ayudan a filtrar la carta y a mostrar advertencias al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {bloque(['etiquetas', 'alergenos'])}
          {bloque(['gruposModificadores'])}
          {grupos.length === 0 && (
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link href="/panel/carta/grupos/nuevo">
                <Plus className="size-4" />
                Crear el primer grupo de opciones
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle>Receta y costo</CardTitle>
          <CardDescription>
            El costo se recalcula automáticamente con el costo actual del inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <EditorReceta
            ingredientes={ingredientes}
            inicial={aLineaInicial(valores.receta)}
            ajustes={ajustes}
          />
          {bloque(['controlaStock', 'rendimiento'])}
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle>Visibilidad</CardTitle>
          <CardDescription>Controla si el platillo aparece en la carta y en el POS.</CardDescription>
        </CardHeader>
        <CardContent>{bloque(['disponible', 'destacado'])}</CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/panel/carta">
            <ArrowLeft className="size-4" />
            Cancelar
          </Link>
        </Button>
        <Button type="submit" disabled={pendiente}>
          {pendiente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {id ? 'Guardar cambios' : 'Crear platillo'}
        </Button>
      </div>
    </form>
  )
}
