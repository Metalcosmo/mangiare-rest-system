/**
 * Datos de ejemplo del sistema.
 *
 * Ejecutar con:  pnpm seed
 * Es idempotente: si ya existen platillos, no vuelve a sembrar.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

type AnyDoc = { id: string | number }

const log = (mensaje: string) => console.log(`  · ${mensaje}`)

const hoy = new Date()
const iso = (d: Date) => d.toISOString()
const sumarDias = (dias: number, base: Date = hoy) => {
  const fecha = new Date(base)
  fecha.setDate(fecha.getDate() + dias)
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

type DocLaxo = Record<string, unknown> & { id: string | number }

/**
 * Vista laxa de la Local API. Los datos semilla son literales de JavaScript y
 * la API tipada de Payload exige los tipos literales exactos de cada unión
 * (`"barra" | "cuadrada" | ...`), lo que hace ruido sin aportar seguridad en
 * un script de carga de datos.
 */
type ApiLaxa = {
  create: (args: Record<string, unknown>) => Promise<DocLaxo>
  update: (args: Record<string, unknown>) => Promise<DocLaxo>
  find: (args: Record<string, unknown>) => Promise<{ docs: DocLaxo[]; totalDocs: number }>
  findByID: (args: Record<string, unknown>) => Promise<DocLaxo>
  count: (args: Record<string, unknown>) => Promise<{ totalDocs: number }>
  findGlobal: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateGlobal: (args: Record<string, unknown>) => Promise<unknown>
}

async function main() {
  const payload = await getPayload({ config })
  const db = payload as unknown as ApiLaxa

  console.log('\n🍝  Sembrando datos de Mangiare…\n')

  const existentes = await db.count({ collection: 'productos', overrideAccess: true })
  if (existentes.totalDocs > 0) {
    console.log(`Ya hay ${existentes.totalDocs} platillos cargados. No se hace nada.\n`)
    process.exit(0)
  }

  // ── Ajustes del restaurante ───────────────────────────────────────────────
  await db.updateGlobal({
    slug: 'ajustes',
    overrideAccess: true,
    data: {
      nombreComercial: 'Mangiare',
      eslogan: 'Cocina italiana de barrio',
      colorPrimario: '#c2410c',
      colorSecundario: '#1c1917',
      telefono: '+52 55 4821 9930',
      email: 'hola@mangiare.mx',
      direccion: 'Av. Ámsterdam 214, Condesa, CDMX',
      instagram: '@mangiare',
      moneda: 'MXN',
      simboloMoneda: '$',
      impuestoPorcentaje: 16,
      impuestoIncluido: true,
      servicioPorcentaje: 0,
      puntosPorUnidad: 1,
      valorPunto: 0.1,
      tiempoEstimadoMinutos: 25,
      aforoMaximo: 72,
      aceptaPedidos: true,
      requiereAprobacionMesa: true,
      mensajeBienvenida:
        'Bienvenido a Mangiare. Explora la carta y ordena directo desde tu mesa; nosotros nos encargamos del resto.',
      mensajePie: 'Gracias por acompañarnos',
      pieTicket: '¡Gracias por su visita! Vuelva pronto.',
      identificacionFiscal: 'MAN240118H72',
      horarios: [
        { dia: 'lunes', abre: '13:00', cierra: '22:30' },
        { dia: 'martes', abre: '13:00', cierra: '22:30' },
        { dia: 'miercoles', abre: '13:00', cierra: '22:30' },
        { dia: 'jueves', abre: '13:00', cierra: '23:30' },
        { dia: 'viernes', abre: '13:00', cierra: '00:30' },
        { dia: 'sabado', abre: '12:00', cierra: '00:30' },
        { dia: 'domingo', abre: '12:00', cierra: '21:00' },
      ],
    },
  })
  log('Ajustes del restaurante')

  // ── Personal ──────────────────────────────────────────────────────────────
  const contrasena = 'mangiare123'
  const equipo = [
    { nombre: 'Lucía', apellidos: 'Ferrari', email: 'admin@mangiare.mx', rol: 'admin', puesto: 'Dueña', tarifaHora: 0 },
    { nombre: 'Marco', apellidos: 'Rinaldi', email: 'gerente@mangiare.mx', rol: 'gerente', puesto: 'Gerente de piso', tarifaHora: 120 },
    { nombre: 'Sofía', apellidos: 'Márquez', email: 'cajera@mangiare.mx', rol: 'cajero', puesto: 'Cajera', tarifaHora: 85 },
    { nombre: 'Diego', apellidos: 'Herrera', email: 'mesero@mangiare.mx', rol: 'mesero', puesto: 'Mesero', tarifaHora: 75 },
    { nombre: 'Ana', apellidos: 'Cortés', email: 'mesera2@mangiare.mx', rol: 'mesero', puesto: 'Mesera', tarifaHora: 75 },
    { nombre: 'Bruno', apellidos: 'Salas', email: 'cocina@mangiare.mx', rol: 'cocina', puesto: 'Chef de partida', tarifaHora: 95 },
  ] as const

  const empleados: Record<string, AnyDoc> = {}
  for (const persona of equipo) {
    const creado = await db.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        nombre: persona.nombre,
        apellidos: persona.apellidos,
        email: persona.email,
        password: contrasena,
        rol: persona.rol,
        puesto: persona.puesto,
        tarifaHora: persona.tarifaHora,
        activo: true,
      },
    })
    empleados[persona.email] = creado
  }
  log(`${equipo.length} empleados (contraseña: ${contrasena})`)

  // ── Zonas y mesas ─────────────────────────────────────────────────────────
  const zonas = [
    { nombre: 'Salón principal', color: '#c2410c', orden: 1, descripcion: 'Interior junto a la barra' },
    { nombre: 'Terraza', color: '#0d9488', orden: 2, descripcion: 'Mesas al aire libre' },
    { nombre: 'Barra', color: '#7c3aed', orden: 3, descripcion: 'Servicio de barra' },
  ]

  const zonasCreadas: Record<string, AnyDoc> = {}
  for (const zona of zonas) {
    zonasCreadas[zona.nombre] = await db.create({
      collection: 'zonas',
      overrideAccess: true,
      data: { ...zona, activa: true },
    })
  }

  const plano: Array<{ nombre: string; zona: string; capacidad: number; x: number; y: number; forma: string }> = [
    { nombre: 'Mesa 1', zona: 'Salón principal', capacidad: 2, x: 12, y: 18, forma: 'cuadrada' },
    { nombre: 'Mesa 2', zona: 'Salón principal', capacidad: 4, x: 34, y: 18, forma: 'cuadrada' },
    { nombre: 'Mesa 3', zona: 'Salón principal', capacidad: 4, x: 56, y: 18, forma: 'cuadrada' },
    { nombre: 'Mesa 4', zona: 'Salón principal', capacidad: 6, x: 78, y: 18, forma: 'rectangular' },
    { nombre: 'Mesa 5', zona: 'Salón principal', capacidad: 2, x: 12, y: 52, forma: 'redonda' },
    { nombre: 'Mesa 6', zona: 'Salón principal', capacidad: 6, x: 38, y: 52, forma: 'rectangular' },
    { nombre: 'Mesa 7', zona: 'Salón principal', capacidad: 4, x: 66, y: 52, forma: 'cuadrada' },
    { nombre: 'Mesa 8', zona: 'Salón principal', capacidad: 4, x: 86, y: 52, forma: 'cuadrada' },
    { nombre: 'Terraza 1', zona: 'Terraza', capacidad: 4, x: 16, y: 26, forma: 'cuadrada' },
    { nombre: 'Terraza 2', zona: 'Terraza', capacidad: 4, x: 44, y: 26, forma: 'cuadrada' },
    { nombre: 'Terraza 3', zona: 'Terraza', capacidad: 6, x: 72, y: 26, forma: 'rectangular' },
    { nombre: 'Barra 1', zona: 'Barra', capacidad: 1, x: 20, y: 46, forma: 'barra' },
    { nombre: 'Barra 2', zona: 'Barra', capacidad: 1, x: 50, y: 46, forma: 'barra' },
    { nombre: 'Barra 3', zona: 'Barra', capacidad: 2, x: 80, y: 46, forma: 'barra' },
  ]

  const mesas: Record<string, AnyDoc> = {}
  for (const mesa of plano) {
    mesas[mesa.nombre] = await db.create({
      collection: 'mesas',
      overrideAccess: true,
      data: {
        nombre: mesa.nombre,
        zona: zonasCreadas[mesa.zona].id,
        capacidad: mesa.capacidad,
        forma: mesa.forma,
        posicionX: mesa.x,
        posicionY: mesa.y,
        estado: 'libre',
        activa: true,
      },
    })
  }
  log(`${zonas.length} zonas y ${plano.length} mesas`)

  // ── Proveedores e ingredientes ────────────────────────────────────────────
  const proveedores = [
    { nombre: 'Distribuidora Bella Italia', contacto: 'Paolo Bianchi', telefono: '+52 55 5512 8890', condicionesPago: '15_dias' },
    { nombre: 'Frutas y Verduras La Condesa', contacto: 'Rosa Medina', telefono: '+52 55 3388 1204', condicionesPago: 'contado' },
    { nombre: 'Carnes Premium del Valle', contacto: 'Jorge Luna', telefono: '+52 55 7741 2093', condicionesPago: '30_dias' },
  ]

  const proveedoresCreados: AnyDoc[] = []
  for (const proveedor of proveedores) {
    proveedoresCreados.push(
      await db.create({ collection: 'proveedores', overrideAccess: true, data: { ...proveedor, activo: true } }),
    )
  }

  const ingredientesBase: Array<{
    nombre: string
    unidad: string
    categoria: string
    stockActual: number
    stockMinimo: number
    stockMaximo: number
    costoUnitario: number
    proveedor: number
  }> = [
    { nombre: 'Harina 00', unidad: 'kg', categoria: 'abarrote', stockActual: 42, stockMinimo: 15, stockMaximo: 80, costoUnitario: 38, proveedor: 0 },
    { nombre: 'Tomate San Marzano', unidad: 'kg', categoria: 'vegetales', stockActual: 26, stockMinimo: 12, stockMaximo: 50, costoUnitario: 62, proveedor: 1 },
    { nombre: 'Mozzarella fresca', unidad: 'kg', categoria: 'lacteos', stockActual: 18, stockMinimo: 8, stockMaximo: 30, costoUnitario: 185, proveedor: 0 },
    { nombre: 'Albahaca fresca', unidad: 'g', categoria: 'vegetales', stockActual: 900, stockMinimo: 300, stockMaximo: 2000, costoUnitario: 0.45, proveedor: 1 },
    { nombre: 'Aceite de oliva extra virgen', unidad: 'l', categoria: 'abarrote', stockActual: 14, stockMinimo: 6, stockMaximo: 24, costoUnitario: 240, proveedor: 0 },
    { nombre: 'Pasta tagliatelle seca', unidad: 'kg', categoria: 'abarrote', stockActual: 22, stockMinimo: 10, stockMaximo: 40, costoUnitario: 78, proveedor: 0 },
    { nombre: 'Pasta rigatoni seca', unidad: 'kg', categoria: 'abarrote', stockActual: 19, stockMinimo: 10, stockMaximo: 40, costoUnitario: 72, proveedor: 0 },
    { nombre: 'Carne molida de res', unidad: 'kg', categoria: 'carnes', stockActual: 16, stockMinimo: 8, stockMaximo: 30, costoUnitario: 210, proveedor: 2 },
    { nombre: 'Lomo de res', unidad: 'kg', categoria: 'carnes', stockActual: 9, stockMinimo: 6, stockMaximo: 18, costoUnitario: 480, proveedor: 2 },
    { nombre: 'Pechuga de pollo', unidad: 'kg', categoria: 'carnes', stockActual: 14, stockMinimo: 8, stockMaximo: 26, costoUnitario: 145, proveedor: 2 },
    { nombre: 'Tocino panceta', unidad: 'kg', categoria: 'carnes', stockActual: 5, stockMinimo: 3, stockMaximo: 12, costoUnitario: 260, proveedor: 2 },
    { nombre: 'Huevo', unidad: 'unidad', categoria: 'lacteos', stockActual: 120, stockMinimo: 60, stockMaximo: 300, costoUnitario: 4.5, proveedor: 1 },
    { nombre: 'Parmesano reggiano', unidad: 'kg', categoria: 'lacteos', stockActual: 4, stockMinimo: 2, stockMaximo: 10, costoUnitario: 620, proveedor: 0 },
    { nombre: 'Mantequilla', unidad: 'kg', categoria: 'lacteos', stockActual: 7, stockMinimo: 4, stockMaximo: 15, costoUnitario: 190, proveedor: 1 },
    { nombre: 'Crema para batir', unidad: 'l', categoria: 'lacteos', stockActual: 11, stockMinimo: 5, stockMaximo: 20, costoUnitario: 88, proveedor: 1 },
    { nombre: 'Champiñones', unidad: 'kg', categoria: 'vegetales', stockActual: 8, stockMinimo: 5, stockMaximo: 18, costoUnitario: 95, proveedor: 1 },
    { nombre: 'Cebolla blanca', unidad: 'kg', categoria: 'vegetales', stockActual: 21, stockMinimo: 10, stockMaximo: 40, costoUnitario: 32, proveedor: 1 },
    { nombre: 'Ajo', unidad: 'kg', categoria: 'vegetales', stockActual: 6, stockMinimo: 3, stockMaximo: 12, costoUnitario: 68, proveedor: 1 },
    { nombre: 'Lechuga romana', unidad: 'unidad', categoria: 'vegetales', stockActual: 24, stockMinimo: 12, stockMaximo: 60, costoUnitario: 18, proveedor: 1 },
    { nombre: 'Vino tinto de cocina', unidad: 'l', categoria: 'bebidas', stockActual: 9, stockMinimo: 4, stockMaximo: 18, costoUnitario: 130, proveedor: 0 },
    { nombre: 'Café espresso en grano', unidad: 'kg', categoria: 'bebidas', stockActual: 5.5, stockMinimo: 3, stockMaximo: 12, costoUnitario: 340, proveedor: 0 },
    { nombre: 'Limón amarillo', unidad: 'kg', categoria: 'vegetales', stockActual: 12, stockMinimo: 6, stockMaximo: 25, costoUnitario: 42, proveedor: 1 },
    { nombre: 'Caja para llevar 26 oz', unidad: 'unidad', categoria: 'desechables', stockActual: 180, stockMinimo: 100, stockMaximo: 500, costoUnitario: 6.2, proveedor: 0 },
  ]

  const ingredientes: Record<string, AnyDoc> = {}
  for (const item of ingredientesBase) {
    ingredientes[item.nombre] = await db.create({
      collection: 'ingredientes',
      overrideAccess: true,
      data: {
        nombre: item.nombre,
        unidad: item.unidad,
        categoria: item.categoria,
        stockActual: item.stockActual,
        stockMinimo: item.stockMinimo,
        stockMaximo: item.stockMaximo,
        costoUnitario: item.costoUnitario,
        proveedor: proveedoresCreados[item.proveedor].id,
        perecedero: ['vegetales', 'lacteos', 'carnes'].includes(item.categoria),
        activo: true,
      },
    })
  }
  log(`${ingredientesBase.length} ingredientes y ${proveedores.length} proveedores`)

  // ── Categorías ────────────────────────────────────────────────────────────
  const categoriasBase = [
    { nombre: 'Entradas', icono: '🥗', orden: 1, descripcion: 'Para empezar la mesa' },
    { nombre: 'Pastas', icono: '🍝', orden: 2, descripcion: 'Frescas y secas, hechas al momento' },
    { nombre: 'Pizzas', icono: '🍕', orden: 3, descripcion: 'Masa madre fermentada 48 horas' },
    { nombre: 'Carnes y pescados', icono: '🥩', orden: 4, descripcion: 'Cortes a la parrilla' },
    { nombre: 'Postres', icono: '🍰', orden: 5, descripcion: 'Dulce final' },
    { nombre: 'Bebidas', icono: '🥤', orden: 6, descripcion: 'Sin alcohol' },
    { nombre: 'Cócteles y vinos', icono: '🍷', orden: 7, descripcion: 'Barra de autor' },
  ]

  const categorias: Record<string, AnyDoc> = {}
  for (const categoria of categoriasBase) {
    categorias[categoria.nombre] = await db.create({
      collection: 'categorias',
      overrideAccess: true,
      data: { ...categoria, activa: true },
    })
  }
  log(`${categoriasBase.length} categorías`)

  // ── Grupos de opciones ────────────────────────────────────────────────────
  const grupoTermino = await db.create({
    collection: 'grupos-modificadores',
    overrideAccess: true,
    data: {
      nombre: 'Término de la carne',
      tipo: 'unica',
      obligatorio: true,
      minSelecciones: 1,
      maxSelecciones: 1,
      opciones: [
        { nombre: 'Término medio', precioExtra: 0, porDefecto: true, disponible: true },
        { nombre: 'Tres cuartos', precioExtra: 0, porDefecto: false, disponible: true },
        { nombre: 'Bien cocido', precioExtra: 0, porDefecto: false, disponible: true },
      ],
    },
  })

  const grupoExtras = await db.create({
    collection: 'grupos-modificadores',
    overrideAccess: true,
    data: {
      nombre: 'Extras',
      tipo: 'multiple',
      obligatorio: false,
      minSelecciones: 0,
      maxSelecciones: 4,
      opciones: [
        { nombre: 'Doble queso', precioExtra: 25, porDefecto: false, disponible: true },
        { nombre: 'Tocino', precioExtra: 30, porDefecto: false, disponible: true },
        { nombre: 'Champiñones', precioExtra: 22, porDefecto: false, disponible: true },
        { nombre: 'Aguacate', precioExtra: 28, porDefecto: false, disponible: true },
        // A propósito agotada: sirve para ver que la opción desaparece de la carta.
        { nombre: 'Piña', precioExtra: 18, porDefecto: false, disponible: false },
      ],
    },
  })

  const grupoPicante = await db.create({
    collection: 'grupos-modificadores',
    overrideAccess: true,
    data: {
      nombre: 'Nivel de picante',
      tipo: 'unica',
      obligatorio: false,
      minSelecciones: 0,
      maxSelecciones: 1,
      opciones: [
        { nombre: 'Sin picante', precioExtra: 0, porDefecto: true, disponible: true },
        { nombre: 'Picante suave', precioExtra: 0, porDefecto: false, disponible: true },
        { nombre: 'Bien picante', precioExtra: 0, porDefecto: false, disponible: true },
      ],
    },
  })
  const grupoTalla = await db.create({
    collection: 'grupos-modificadores',
    overrideAccess: true,
    data: {
      nombre: 'Talla',
      descripcion: 'Elige el tamaño de tu pizza',
      tipo: 'unica',
      obligatorio: true,
      minSelecciones: 1,
      maxSelecciones: 1,
      opciones: [
        { nombre: 'Chica', precioExtra: 0, porDefecto: true, disponible: true },
        { nombre: 'Mediana', precioExtra: 40, porDefecto: false, disponible: true },
        { nombre: 'Grande', precioExtra: 80, porDefecto: false, disponible: true },
      ],
    },
  })
  log('4 grupos de opciones')

  // ── Platillos ─────────────────────────────────────────────────────────────
  type Receta = { ingrediente: string; cantidad: number; unidad?: string }

  const platillos: Array<{
    nombre: string
    categoria: string
    precio: number
    precioPromocional?: number
    descripcion: string
    estacion: string
    tiempoPreparacion: number
    etiquetas?: string[]
    alergenos?: string[]
    destacado?: boolean
    receta?: Receta[]
    grupos?: Array<string | AnyDoc>
  }> = [
    {
      nombre: 'Bruschetta della casa',
      categoria: 'Entradas',
      precio: 118,
      descripcion: 'Pan de masa madre, tomate San Marzano, albahaca fresca y aceite de oliva.',
      estacion: 'cocina',
      tiempoPreparacion: 8,
      etiquetas: ['vegetariano', 'recomendado'],
      alergenos: ['gluten'],
      destacado: true,
      receta: [
        { ingrediente: 'Harina 00', cantidad: 120, unidad: 'g' },
        { ingrediente: 'Tomate San Marzano', cantidad: 180, unidad: 'g' },
        { ingrediente: 'Albahaca fresca', cantidad: 10, unidad: 'g' },
        { ingrediente: 'Aceite de oliva extra virgen', cantidad: 20, unidad: 'ml' },
      ],
    },
    {
      nombre: 'Carpaccio de res',
      categoria: 'Entradas',
      precio: 185,
      descripcion: 'Láminas finas de lomo, parmesano, alcaparras y limón.',
      estacion: 'cocina',
      tiempoPreparacion: 12,
      alergenos: ['lacteos'],
      receta: [
        { ingrediente: 'Lomo de res', cantidad: 110, unidad: 'g' },
        { ingrediente: 'Parmesano reggiano', cantidad: 25, unidad: 'g' },
        { ingrediente: 'Limón amarillo', cantidad: 30, unidad: 'g' },
      ],
    },
    {
      nombre: 'Ensalada César',
      categoria: 'Entradas',
      precio: 132,
      descripcion: 'Lechuga romana, aderezo césar de la casa, crutones y parmesano.',
      estacion: 'cocina',
      tiempoPreparacion: 7,
      alergenos: ['gluten', 'lacteos', 'huevo'],
      receta: [
        { ingrediente: 'Lechuga romana', cantidad: 1, unidad: 'unidad' },
        { ingrediente: 'Parmesano reggiano', cantidad: 20, unidad: 'g' },
        { ingrediente: 'Huevo', cantidad: 1, unidad: 'unidad' },
        { ingrediente: 'Aceite de oliva extra virgen', cantidad: 25, unidad: 'ml' },
      ],
    },
    {
      nombre: 'Tagliatelle a la boloñesa',
      categoria: 'Pastas',
      precio: 215,
      descripcion: 'Pasta al huevo con ragú de res cocido a fuego lento por seis horas.',
      estacion: 'cocina',
      tiempoPreparacion: 18,
      etiquetas: ['recomendado'],
      alergenos: ['gluten', 'huevo', 'lacteos'],
      destacado: true,
      receta: [
        { ingrediente: 'Pasta tagliatelle seca', cantidad: 140, unidad: 'g' },
        { ingrediente: 'Carne molida de res', cantidad: 150, unidad: 'g' },
        { ingrediente: 'Tomate San Marzano', cantidad: 160, unidad: 'g' },
        { ingrediente: 'Cebolla blanca', cantidad: 40, unidad: 'g' },
        { ingrediente: 'Parmesano reggiano', cantidad: 15, unidad: 'g' },
        { ingrediente: 'Vino tinto de cocina', cantidad: 40, unidad: 'ml' },
      ],
      grupos: [grupoExtras],
    },
    {
      nombre: 'Rigatoni all’arrabbiata',
      categoria: 'Pastas',
      precio: 189,
      descripcion: 'Tomate, ajo, chile seco y perejil. Sencilla y honesta.',
      estacion: 'cocina',
      tiempoPreparacion: 15,
      etiquetas: ['vegetariano', 'picante', 'vegano'],
      alergenos: ['gluten'],
      receta: [
        { ingrediente: 'Pasta rigatoni seca', cantidad: 140, unidad: 'g' },
        { ingrediente: 'Tomate San Marzano', cantidad: 200, unidad: 'g' },
        { ingrediente: 'Ajo', cantidad: 12, unidad: 'g' },
        { ingrediente: 'Aceite de oliva extra virgen', cantidad: 20, unidad: 'ml' },
      ],
      grupos: [grupoPicante],
    },
    {
      nombre: 'Fettuccine alfredo',
      categoria: 'Pastas',
      precio: 205,
      descripcion: 'Mantequilla, crema, parmesano y pimienta negra recién molida.',
      estacion: 'cocina',
      tiempoPreparacion: 16,
      etiquetas: ['vegetariano'],
      alergenos: ['gluten', 'lacteos'],
      receta: [
        { ingrediente: 'Pasta tagliatelle seca', cantidad: 140, unidad: 'g' },
        { ingrediente: 'Crema para batir', cantidad: 90, unidad: 'ml' },
        { ingrediente: 'Mantequilla', cantidad: 25, unidad: 'g' },
        { ingrediente: 'Parmesano reggiano', cantidad: 30, unidad: 'g' },
      ],
    },
    {
      nombre: 'Pizza margarita',
      categoria: 'Pizzas',
      precio: 178,
      descripcion: 'San Marzano, mozzarella fresca y albahaca. La medida de toda pizzeria.',
      estacion: 'parrilla',
      tiempoPreparacion: 14,
      etiquetas: ['vegetariano', 'recomendado'],
      alergenos: ['gluten', 'lacteos'],
      destacado: true,
      receta: [
        { ingrediente: 'Harina 00', cantidad: 220, unidad: 'g' },
        { ingrediente: 'Tomate San Marzano', cantidad: 140, unidad: 'g' },
        { ingrediente: 'Mozzarella fresca', cantidad: 120, unidad: 'g' },
        { ingrediente: 'Albahaca fresca', cantidad: 8, unidad: 'g' },
      ],
      grupos: [grupoTalla, grupoExtras],
    },
    {
      nombre: 'Pizza diavola',
      categoria: 'Pizzas',
      precio: 208,
      descripcion: 'Mozzarella, salami picante y un toque de miel de chile.',
      estacion: 'parrilla',
      tiempoPreparacion: 15,
      etiquetas: ['picante'],
      alergenos: ['gluten', 'lacteos'],
      receta: [
        { ingrediente: 'Harina 00', cantidad: 220, unidad: 'g' },
        { ingrediente: 'Tomate San Marzano', cantidad: 140, unidad: 'g' },
        { ingrediente: 'Mozzarella fresca', cantidad: 130, unidad: 'g' },
        { ingrediente: 'Tocino panceta', cantidad: 60, unidad: 'g' },
      ],
      grupos: [grupoTalla, grupoExtras, grupoPicante],
    },
    {
      nombre: 'Pizza quattro formaggi',
      categoria: 'Pizzas',
      precio: 226,
      descripcion: 'Mozzarella, parmesano, gorgonzola y queso de cabra.',
      estacion: 'parrilla',
      tiempoPreparacion: 15,
      etiquetas: ['vegetariano'],
      alergenos: ['gluten', 'lacteos'],
      receta: [
        { ingrediente: 'Harina 00', cantidad: 220, unidad: 'g' },
        { ingrediente: 'Mozzarella fresca', cantidad: 110, unidad: 'g' },
        { ingrediente: 'Parmesano reggiano', cantidad: 45, unidad: 'g' },
        { ingrediente: 'Crema para batir', cantidad: 40, unidad: 'ml' },
      ],
      grupos: [grupoTalla, grupoExtras],
    },
    {
      nombre: 'Bistecca alla griglia',
      categoria: 'Carnes y pescados',
      precio: 465,
      descripcion: 'Lomo de res de 350 g a la parrilla, romero, sal de mar y mantequilla de hierbas.',
      estacion: 'parrilla',
      tiempoPreparacion: 25,
      etiquetas: ['recomendado'],
      destacado: true,
      receta: [
        { ingrediente: 'Lomo de res', cantidad: 350, unidad: 'g' },
        { ingrediente: 'Mantequilla', cantidad: 30, unidad: 'g' },
        { ingrediente: 'Ajo', cantidad: 8, unidad: 'g' },
        { ingrediente: 'Aceite de oliva extra virgen', cantidad: 15, unidad: 'ml' },
      ],
      grupos: [grupoTermino],
    },
    {
      nombre: 'Pollo alla cacciatora',
      categoria: 'Carnes y pescados',
      precio: 268,
      descripcion: 'Pechuga de pollo guisada con tomate, champiñones y vino tinto.',
      estacion: 'cocina',
      tiempoPreparacion: 22,
      receta: [
        { ingrediente: 'Pechuga de pollo', cantidad: 220, unidad: 'g' },
        { ingrediente: 'Tomate San Marzano', cantidad: 140, unidad: 'g' },
        { ingrediente: 'Champiñones', cantidad: 80, unidad: 'g' },
        { ingrediente: 'Vino tinto de cocina', cantidad: 60, unidad: 'ml' },
      ],
    },
    {
      nombre: 'Salmón al limón',
      categoria: 'Carnes y pescados',
      precio: 342,
      descripcion: 'Filete de salmón a la plancha con mantequilla de limón y verduras.',
      estacion: 'parrilla',
      tiempoPreparacion: 20,
      etiquetas: ['sin_gluten'],
      alergenos: ['pescado', 'lacteos'],
      receta: [
        { ingrediente: 'Limón amarillo', cantidad: 60, unidad: 'g' },
        { ingrediente: 'Mantequilla', cantidad: 25, unidad: 'g' },
        { ingrediente: 'Champiñones', cantidad: 60, unidad: 'g' },
      ],
    },
    {
      nombre: 'Tiramisú de la casa',
      categoria: 'Postres',
      precio: 118,
      descripcion: 'Bizcocho bañado en café espresso, mascarpone y cacao.',
      estacion: 'postres',
      tiempoPreparacion: 8,
      etiquetas: ['recomendado'],
      alergenos: ['gluten', 'lacteos', 'huevo'],
      receta: [
        { ingrediente: 'Café espresso en grano', cantidad: 18, unidad: 'g' },
        { ingrediente: 'Crema para batir', cantidad: 80, unidad: 'ml' },
        { ingrediente: 'Huevo', cantidad: 2, unidad: 'unidad' },
      ],
    },
    {
      nombre: 'Panna cotta de frutos rojos',
      categoria: 'Postres',
      precio: 98,
      descripcion: 'Crema cocida con vainilla y coulis de frutos rojos.',
      estacion: 'postres',
      tiempoPreparacion: 6,
      etiquetas: ['sin_gluten'],
      alergenos: ['lacteos'],
      receta: [
        { ingrediente: 'Crema para batir', cantidad: 120, unidad: 'ml' },
        { ingrediente: 'Limón amarillo', cantidad: 15, unidad: 'g' },
      ],
    },
    {
      nombre: 'Agua mineral',
      categoria: 'Bebidas',
      precio: 48,
      descripcion: 'Botella de 600 ml, con o sin gas.',
      estacion: 'barra',
      tiempoPreparacion: 2,
      etiquetas: ['vegano'],
    },
    {
      nombre: 'Limonada de la casa',
      categoria: 'Bebidas',
      precio: 62,
      descripcion: 'Limón recién exprimido, menta y un toque de jarabe.',
      estacion: 'barra',
      tiempoPreparacion: 5,
      etiquetas: ['vegano', 'sin_gluten'],
      receta: [{ ingrediente: 'Limón amarillo', cantidad: 120, unidad: 'g' }],
    },
    {
      nombre: 'Café espresso',
      categoria: 'Bebidas',
      precio: 45,
      descripcion: 'Mezcla de la casa, tueste medio.',
      estacion: 'barra',
      tiempoPreparacion: 3,
      receta: [{ ingrediente: 'Café espresso en grano', cantidad: 9, unidad: 'g' }],
    },
    {
      nombre: 'Negroni',
      categoria: 'Cócteles y vinos',
      precio: 165,
      descripcion: 'Gin, vermut rojo y bitter, partes iguales.',
      estacion: 'barra',
      tiempoPreparacion: 6,
      etiquetas: ['recomendado'],
    },
    {
      nombre: 'Copa de vino tinto',
      categoria: 'Cócteles y vinos',
      precio: 130,
      descripcion: 'Selección del sommelier, 150 ml.',
      estacion: 'barra',
      tiempoPreparacion: 3,
      receta: [{ ingrediente: 'Vino tinto de cocina', cantidad: 150, unidad: 'ml' }],
    },
  ]

  const productos: Record<string, AnyDoc> = {}
  let ordenPlatillo = 0
  for (const platillo of platillos) {
    ordenPlatillo += 1
    productos[platillo.nombre] = await db.create({
      collection: 'productos',
      overrideAccess: true,
      data: {
        orden: ordenPlatillo,
        nombre: platillo.nombre,
        descripcion: platillo.descripcion,
        categoria: categorias[platillo.categoria].id,
        precio: platillo.precio,
        precioPromocional: platillo.precioPromocional,
        estacion: platillo.estacion,
        tiempoPreparacion: platillo.tiempoPreparacion,
        etiquetas: platillo.etiquetas ?? [],
        alergenos: platillo.alergenos ?? [],
        destacado: platillo.destacado ?? false,
        disponible: true,
        controlaStock: Boolean(platillo.receta?.length),
        receta: (platillo.receta ?? []).map((linea) => ({
          ingrediente: ingredientes[linea.ingrediente].id,
          cantidad: linea.cantidad,
          unidad: linea.unidad,
        })),
        gruposModificadores: platillo.grupos ?? [],
      },
    })
  }
  log(`${platillos.length} platillos con receta y costo calculado`)

  // ── Clientes ──────────────────────────────────────────────────────────────
  const clientesBase = [
    { nombre: 'Valeria Ortiz', telefono: '5551234567', email: 'valeria@example.com', puntos: 420, visitas: 14, totalGastado: 6840, etiquetas: ['vip', 'frecuente'] },
    { nombre: 'Andrés Beltrán', telefono: '5559876543', email: 'andres@example.com', puntos: 180, visitas: 6, totalGastado: 2410, etiquetas: ['frecuente'] },
    { nombre: 'Camila Duarte', telefono: '5553322110', email: 'camila@example.com', puntos: 62, visitas: 2, totalGastado: 780, etiquetas: ['nuevo'] },
    { nombre: 'Ricardo Peña', telefono: '5557712034', email: 'ricardo@example.com', puntos: 950, visitas: 28, totalGastado: 14200, etiquetas: ['vip', 'frecuente'] },
    { nombre: 'Fernanda Ríos', telefono: '5554409871', email: 'fernanda@example.com', puntos: 30, visitas: 1, totalGastado: 320, etiquetas: ['nuevo'] },
    { nombre: 'Héctor Navarro', telefono: '5552298765', email: 'hector@example.com', puntos: 0, visitas: 3, totalGastado: 890, etiquetas: ['inactivo'] },
    { nombre: 'Paula Sandoval', telefono: '5556643210', email: 'paula@example.com', puntos: 245, visitas: 9, totalGastado: 3980, etiquetas: ['frecuente'] },
    { nombre: 'Empresa Vertex SA', telefono: '5558811223', email: 'compras@vertex.example', puntos: 610, visitas: 12, totalGastado: 9840, etiquetas: ['corporativo', 'vip'] },
  ]

  const clientes: Record<string, AnyDoc> = {}
  for (const cliente of clientesBase) {
    clientes[cliente.nombre] = await db.create({
      collection: 'clientes',
      overrideAccess: true,
      data: { ...cliente, aceptaMarketing: true },
    })
  }
  log(`${clientesBase.length} clientes`)

  // ── Lealtad y cupones ─────────────────────────────────────────────────────
  const cupones = [
    { codigo: 'BIENVENIDO10', tipo: 'porcentaje', valor: 10, minimoCompra: 200, usosMaximos: 0, usosActuales: 148, activo: true, descripcion: '10% en tu primera visita' },
    { codigo: 'PASTA2X1', tipo: 'porcentaje', valor: 50, minimoCompra: 400, usosMaximos: 300, usosActuales: 96, activo: true, descripcion: '50% en la segunda pasta', canales: ['mesa'] },
    { codigo: 'MARTES100', tipo: 'monto', valor: 100, minimoCompra: 500, usosMaximos: 500, usosActuales: 213, activo: true, descripcion: '$100 de descuento los martes' },
  ]
  for (const cupon of cupones) {
    await db.create({ collection: 'cupones', overrideAccess: true, data: cupon })
  }

  const recompensas = [
    { nombre: 'Postre de la casa', tipo: 'producto_gratis', costoPuntos: 250, producto: productos['Tiramisú de la casa'].id, activa: true, descripcion: 'Canjea un postre sin costo.' },
    { nombre: '15% en tu cuenta', tipo: 'descuento_porcentaje', costoPuntos: 400, valorDescuento: 15, activa: true, descripcion: 'Descuento sobre el total de la cuenta.' },
    { nombre: '$150 de descuento', tipo: 'descuento_monto', costoPuntos: 600, valorDescuento: 150, activa: true, descripcion: 'Monto fijo sobre el total.' },
    { nombre: 'Copa de vino de cortesía', tipo: 'producto_gratis', costoPuntos: 180, producto: productos['Copa de vino tinto'].id, activa: true, descripcion: 'Una copa por cuenta.' },
  ]
  for (const recompensa of recompensas) {
    await db.create({ collection: 'recompensas', overrideAccess: true, data: recompensa })
  }
  log(`${cupones.length} cupones y ${recompensas.length} recompensas`)

  // ── Marketing ─────────────────────────────────────────────────────────────
  await db.create({
    collection: 'campanas',
    overrideAccess: true,
    data: {
      nombre: 'Cumpleaños del mes',
      canal: 'email',
      segmento: 'cumpleanos',
      asunto: '¡Feliz cumpleaños, {nombre}! Postre de cortesía te espera',
      mensaje: 'Ven a celebrar con nosotros este mes y llévate un postre de la casa sin costo.',
      estado: 'programada',
      programadaPara: iso(sumarDias(3)),
      enviados: 0,
    },
  })
  await db.create({
    collection: 'campanas',
    overrideAccess: true,
    data: {
      nombre: 'Martes de pasta',
      canal: 'whatsapp',
      segmento: 'frecuente',
      mensaje: 'Los martes la segunda pasta va por la casa. Código PASTA2X1.',
      cupon: (await db.find({ collection: 'cupones', where: { codigo: { equals: 'PASTA2X1' } }, overrideAccess: true })).docs[0]?.id,
      estado: 'enviada',
      enviados: 1284,
      aperturas: 902,
      clics: 318,
      conversiones: 96,
      ingresosGenerados: 41850,
    },
  })
  await db.create({
    collection: 'campanas',
    overrideAccess: true,
    data: {
      nombre: 'Te extrañamos',
      canal: 'sms',
      segmento: 'inactivo',
      mensaje: '{nombre}, te guardamos tu mesa. 15% de descuento con BIENVENIDO10.',
      estado: 'borrador',
    },
  })
  log('3 campañas de marketing')

  // ── Turnos de la semana ───────────────────────────────────────────────────
  const planTurnos = [
    { email: 'gerente@mangiare.mx', puesto: 'gerente', entrada: '13:00', salida: '22:00' },
    { email: 'cajera@mangiare.mx', puesto: 'cajero', entrada: '13:00', salida: '21:00' },
    { email: 'mesero@mangiare.mx', puesto: 'mesero', entrada: '14:00', salida: '23:00' },
    { email: 'mesera2@mangiare.mx', puesto: 'mesero', entrada: '14:00', salida: '23:00' },
    { email: 'cocina@mangiare.mx', puesto: 'cocina', entrada: '12:00', salida: '21:00' },
  ]

  let totalTurnos = 0
  for (let dia = 0; dia < 7; dia += 1) {
    for (const turno of planTurnos) {
      await db.create({
        collection: 'turnos',
        overrideAccess: true,
        data: {
          empleado: empleados[turno.email].id,
          fecha: iso(sumarDias(dia)),
          horaInicio: turno.entrada,
          horaFin: turno.salida,
          puesto: turno.puesto,
          estado: dia === 0 ? 'confirmado' : 'programado',
        },
      })
      totalTurnos += 1
    }
  }
  log(`${totalTurnos} turnos programados para la semana`)

  // ── Reservaciones ─────────────────────────────────────────────────────────
  const reservas = [
    { nombreCliente: 'Valeria Ortiz', cliente: 'Valeria Ortiz', personas: 4, hora: '14:30', mesa: 'Mesa 4', estado: 'confirmada', ocasion: 'negocios', dia: 0 },
    { nombreCliente: 'Ricardo Peña', cliente: 'Ricardo Peña', personas: 2, hora: '20:00', mesa: 'Mesa 1', estado: 'confirmada', ocasion: 'aniversario', dia: 0 },
    { nombreCliente: 'Paula Sandoval', cliente: 'Paula Sandoval', personas: 6, hora: '21:00', mesa: 'Terraza 3', estado: 'pendiente', ocasion: 'cumpleanos', dia: 0 },
    { nombreCliente: 'Empresa Vertex SA', cliente: 'Empresa Vertex SA', personas: 10, hora: '13:30', mesa: 'Mesa 6', estado: 'confirmada', ocasion: 'negocios', dia: 1 },
    { nombreCliente: 'Camila Duarte', cliente: 'Camila Duarte', personas: 2, hora: '19:30', mesa: 'Mesa 5', estado: 'pendiente', ocasion: 'ninguna', dia: 1 },
    { nombreCliente: 'Andrés Beltrán', cliente: 'Andrés Beltrán', personas: 3, hora: '15:00', mesa: 'Terraza 1', estado: 'confirmada', ocasion: 'ninguna', dia: 2 },
  ]

  for (const reserva of reservas) {
    await db.create({
      collection: 'reservaciones',
      overrideAccess: true,
      data: {
        nombreCliente: reserva.nombreCliente,
        cliente: clientes[reserva.cliente].id,
        telefono: '5551234567',
        fecha: iso(sumarDias(reserva.dia)),
        hora: reserva.hora,
        personas: reserva.personas,
        mesa: mesas[reserva.mesa].id,
        estado: reserva.estado,
        ocasion: reserva.ocasion,
      },
    })
  }
  log(`${reservas.length} reservaciones`)

  // ── Pedidos de ejemplo ────────────────────────────────────────────────────
  const pedidosDemo: Array<{
    canal: 'mesa' | 'mostrador' | 'para_llevar'
    estado: string
    mesa?: string
    cliente?: string
    mesero?: string
    comensales?: number
    minutosAtras: number
    items: Array<{ producto: string; cantidad: number; notas?: string; modificadores?: Array<{ nombre: string; precioExtra: number }>; estadoItem?: string }>
    pago?: { metodo: string; propina?: number }
  }> = [
    {
      canal: 'mesa',
      estado: 'en_preparacion',
      mesa: 'Mesa 2',
      cliente: 'Valeria Ortiz',
      mesero: 'mesero@mangiare.mx',
      comensales: 3,
      minutosAtras: 22,
      items: [
        { producto: 'Pizza margarita', cantidad: 2, modificadores: [{ nombre: 'Doble queso', precioExtra: 25 }], estadoItem: 'preparando' },
        { producto: 'Limonada de la casa', cantidad: 3, estadoItem: 'listo' },
      ],
    },
    {
      canal: 'mesa',
      estado: 'nuevo',
      mesa: 'Terraza 2',
      cliente: 'Ricardo Peña',
      mesero: 'mesera2@mangiare.mx',
      comensales: 2,
      minutosAtras: 6,
      items: [
        { producto: 'Bistecca alla griglia', cantidad: 1, modificadores: [{ nombre: 'Tres cuartos', precioExtra: 0 }], notas: 'Sin sal en la superficie' },
        { producto: 'Copa de vino tinto', cantidad: 2 },
      ],
    },
    {
      canal: 'mesa',
      estado: 'listo',
      mesa: 'Mesa 7',
      mesero: 'mesero@mangiare.mx',
      comensales: 4,
      minutosAtras: 34,
      items: [
        { producto: 'Tagliatelle a la boloñesa', cantidad: 2, estadoItem: 'listo' },
        { producto: 'Ensalada César', cantidad: 1, estadoItem: 'listo' },
        { producto: 'Agua mineral', cantidad: 2, estadoItem: 'listo' },
      ],
    },
    {
      canal: 'mostrador',
      estado: 'pagado',
      cliente: 'Camila Duarte',
      minutosAtras: 95,
      items: [
        { producto: 'Café espresso', cantidad: 2, estadoItem: 'listo' },
        { producto: 'Tiramisú de la casa', cantidad: 1, estadoItem: 'listo' },
      ],
      pago: { metodo: 'tarjeta', propina: 20 },
    },
    {
      canal: 'para_llevar',
      estado: 'en_preparacion',
      cliente: 'Fernanda Ríos',
      minutosAtras: 12,
      items: [
        { producto: 'Pizza diavola', cantidad: 1, modificadores: [{ nombre: 'Bien picante', precioExtra: 0 }] },
        { producto: 'Panna cotta de frutos rojos', cantidad: 2 },
      ],
    },
    {
      canal: 'para_llevar',
      estado: 'pagado',
      cliente: 'Paula Sandoval',
      minutosAtras: 240,
      items: [
        { producto: 'Rigatoni all’arrabbiata', cantidad: 2, estadoItem: 'listo' },
        { producto: 'Limonada de la casa', cantidad: 2, estadoItem: 'listo' },
      ],
      pago: { metodo: 'efectivo', propina: 30 },
    },
  ]

  for (const demo of pedidosDemo) {
    const creado = await db.create({
      collection: 'pedidos',
      overrideAccess: true,
      data: {
        canal: demo.canal,
        estado: 'nuevo',
        mesa: demo.mesa ? mesas[demo.mesa].id : undefined,
        cliente: demo.cliente ? clientes[demo.cliente].id : undefined,
        clienteNombre: demo.cliente,
        mesero: demo.mesero ? empleados[demo.mesero].id : empleados['cajera@mangiare.mx'].id,
        comensales: demo.comensales ?? 1,
        items: demo.items.map((item) => ({
          producto: productos[item.producto].id,
          cantidad: item.cantidad,
          modificadores: item.modificadores ?? [],
          notas: item.notas,
          estadoItem: item.estadoItem ?? 'pendiente',
        })),
      },
    })

    const fecha = new Date(Date.now() - demo.minutosAtras * 60000)

    const actualizado = await db.update({
      collection: 'pedidos',
      id: creado.id,
      overrideAccess: true,
      data: {
        estado: demo.estado,
        horaEnvioCocina: iso(fecha),
        horaListo:
          demo.estado === 'listo' || demo.estado === 'pagado'
            ? iso(new Date(fecha.getTime() + 18 * 60000))
            : undefined,
        pagos: demo.pago
          ? [
              {
                metodo: demo.pago.metodo,
                monto: creado.total ?? 0,
                propina: demo.pago.propina ?? 0,
                fecha: iso(new Date(fecha.getTime() + 40 * 60000)),
              },
            ]
          : [],
        propina: demo.pago?.propina ?? 0,
      },
    })

    // Los pedidos históricos no deben re-descontar inventario.
    void actualizado
  }
  log(`${pedidosDemo.length} pedidos de ejemplo`)

  // ── Mesa abierta desde el QR ──────────────────────────────────────────────
  // Deja a la vista las tres piezas de la cuenta compartida: una ronda ya
  // enviada, otra esperando al mesero y lo que la mesa todavía no manda.
  const mesaQr = mesas['Mesa 5']
  if (mesaQr) {
    const sesion = await db.create({
      collection: 'sesiones-mesa',
      overrideAccess: true,
      data: {
        mesa: mesaQr.id,
        anfitrionNombre: 'Ana Pérez',
        anfitrionCedula: 'V12345678',
        tokenAnfitrion: 'demo-anfitrion',
        tokenInvitado: 'demo-invitado',
        estado: 'abierta',
        origen: 'cliente',
        abiertaEn: iso(new Date(Date.now() - 18 * 60000)),
      },
    })

    const rondaEnviada = await db.create({
      collection: 'pedidos',
      overrideAccess: true,
      data: {
        canal: 'mesa',
        estado: 'nuevo',
        mesa: mesaQr.id,
        sesion: sesion.id,
        ronda: 1,
        clienteNombre: 'Ana Pérez',
        comensales: 2,
        mesero: empleados['mesero@mangiare.mx'].id,
        items: [
          { producto: productos['Pizza margarita'].id, cantidad: 1, estadoItem: 'preparando' },
          { producto: productos['Ensalada César'].id, cantidad: 1, estadoItem: 'pendiente' },
        ],
      },
    })

    await db.create({
      collection: 'pedidos',
      overrideAccess: true,
      data: {
        canal: 'mesa',
        estado: 'por_confirmar',
        mesa: mesaQr.id,
        sesion: sesion.id,
        ronda: 2,
        clienteNombre: 'Ana Pérez',
        comensales: 2,
        items: [{ producto: productos['Tiramisú de la casa'].id, cantidad: 2, estadoItem: 'pendiente' }],
      },
    })

    const borrador = await db.create({
      collection: 'pedidos',
      overrideAccess: true,
      data: {
        canal: 'mesa',
        estado: 'borrador',
        mesa: mesaQr.id,
        sesion: sesion.id,
        clienteNombre: 'Ana Pérez',
        comensales: 2,
        items: [
          {
            producto: productos['Tagliatelle a la boloñesa'].id,
            cantidad: 1,
            notas: 'Sin panceta para compartir',
          },
        ],
      },
    })

    await db.update({
      collection: 'mesas',
      id: mesaQr.id,
      overrideAccess: true,
      data: { estado: 'ocupada' },
    })

    log(
      `Mesa abierta por Ana Pérez (cédula V12345678): ronda ${rondaEnviada.ronda}, una por confirmar y ${((borrador.items ?? []) as unknown[]).length} platillo sin enviar`,
    )
  }

  // ── Pedidos históricos de la semana ───────────────────────────────────────
  // El tablero necesita varios días de ventas para mostrar tendencia y
  // comparativas; se generan de forma determinista para que el demo sea estable.
  const semilla = (n: number) => {
    const x = Math.sin(n * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }

  const nombresPlatillos = platillos.map((platillo) => platillo.nombre)
  let historicosCreados = 0

  for (let dia = 1; dia <= 6; dia += 1) {
    const comandasDelDia = 3 + Math.floor(semilla(dia) * 4)

    for (let n = 0; n < comandasDelDia; n += 1) {
      const indice = dia * 10 + n
      const lineas = 1 + Math.floor(semilla(indice) * 3)
      const items: Array<Record<string, unknown>> = []

      for (let l = 0; l < lineas; l += 1) {
        const platillo = nombresPlatillos[Math.floor(semilla(indice * 7 + l) * nombresPlatillos.length)]
        items.push({
          producto: productos[platillo].id,
          cantidad: 1 + Math.floor(semilla(indice * 13 + l) * 2),
          estadoItem: 'listo',
        })
      }

      const nombresClientes = Object.keys(clientes)
      const cliente = nombresClientes[Math.floor(semilla(indice * 3) * nombresClientes.length)]
      const fecha = new Date(Date.now() - dia * 86400000 - Math.floor(semilla(indice * 5) * 180) * 60000)

      await db.create({
        collection: 'pedidos',
        overrideAccess: true,
        data: {
          canal: 'mostrador',
          estado: 'pagado',
          cliente: clientes[cliente].id,
          clienteNombre: cliente,
          comensales: 1 + Math.floor(semilla(indice * 11) * 3),
          createdAt: iso(fecha),
          horaEnvioCocina: iso(fecha),
          horaListo: iso(new Date(fecha.getTime() + 15 * 60000)),
          horaEntrega: iso(new Date(fecha.getTime() + 20 * 60000)),
          horaCobro: iso(new Date(fecha.getTime() + 25 * 60000)),
          propina: Math.round(semilla(indice * 17) * 60),
          items,
        },
      })
      historicosCreados += 1
    }
  }
  log(`${historicosCreados} pedidos históricos de los últimos 6 días`)

  const totales = {
    platillos: (await db.count({ collection: 'productos', overrideAccess: true })).totalDocs,
    pedidos: (await db.count({ collection: 'pedidos', overrideAccess: true })).totalDocs,
    movimientos: (await db.count({ collection: 'movimientos-inventario', overrideAccess: true })).totalDocs,
  }

  console.log('\n✅  Listo.')
  console.log(`    ${totales.platillos} platillos · ${totales.pedidos} pedidos · ${totales.movimientos} movimientos de inventario`)
  console.log('\n    Panel:  http://localhost:3000/panel')
  console.log('    Carta:  http://localhost:3000/mesa/mesa-1')
  console.log(`    Acceso: admin@mangiare.mx / ${contrasena}\n`)

  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌  Error sembrando datos:\n', error)
  process.exit(1)
})
