/**
 * Definiciones declarativas de los recursos del panel.
 *
 * Cada recurso describe sus campos y sus columnas, lo que permite reutilizar
 * el mismo formulario, la misma tabla y la misma acción de guardado en todos
 * los módulos. Es data pura: se puede importar desde el cliente y el servidor.
 */

export type Opcion = { label: string; value: string }

/** Opciones disponibles para los campos de relación, indexadas por fuente. */
export type MapaOpciones = Record<string, Opcion[]>

/** Valor centinela para "sin definir" en los campos opcionales. */
export const SIN_VALOR = '__ninguno__'

type Base = {
  nombre: string
  etiqueta: string
  ayuda?: string
  requerido?: boolean
  /** 'medio' ocupa media fila en el formulario. */
  ancho?: 'completo' | 'medio'
}

export type Campo =
  | (Base & { tipo: 'texto'; placeholder?: string })
  | (Base & { tipo: 'contrasena'; placeholder?: string })
  | (Base & { tipo: 'textarea'; filas?: number })
  | (Base & { tipo: 'numero'; min?: number; max?: number; paso?: number; placeholder?: string })
  | (Base & { tipo: 'booleano' })
  | (Base & { tipo: 'select'; opciones: Opcion[] })
  | (Base & { tipo: 'multiselect'; opciones: Opcion[] })
  | (Base & { tipo: 'fecha'; conHora?: boolean })
  | (Base & { tipo: 'relacion'; fuente: string; multiple?: boolean })

export type TipoColumna = 'texto' | 'numero' | 'moneda' | 'booleano' | 'fecha' | 'fechaHora' | 'lista'

export type Columna = {
  nombre: string
  etiqueta: string
  tipo?: TipoColumna
  className?: string
}

export type DefinicionRecurso = {
  coleccion: string
  singular: string
  plural: string
  descripcion?: string
  campos: Campo[]
  columnas: Columna[]
  /** Ruta del panel que hay que revalidar al guardar. */
  ruta: string
  ordenPor?: string
  limite?: number
  /** Profundidad de poblado de relaciones. */
  profundidad?: number
  soloLectura?: boolean
}

const OPCIONES_ACTIVO: Campo = {
  nombre: 'activo',
  etiqueta: 'Activo',
  tipo: 'booleano',
  ancho: 'medio',
}

export const RECURSOS = {
  empleados: {
    coleccion: 'users',
    singular: 'Empleado',
    plural: 'Empleados',
    descripcion:
      'Cada empleado tiene su propio acceso al panel; el rol determina qué secciones ve.',
    ruta: '/panel/personal',
    ordenPor: 'nombre',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Nombre' },
      { nombre: 'email', etiqueta: 'Correo' },
      { nombre: 'rol', etiqueta: 'Rol' },
      { nombre: 'puesto', etiqueta: 'Puesto' },
      { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, ancho: 'medio' },
      { nombre: 'apellidos', etiqueta: 'Apellidos', tipo: 'texto', ancho: 'medio' },
      {
        nombre: 'email',
        etiqueta: 'Correo de acceso',
        tipo: 'texto',
        requerido: true,
        ancho: 'medio',
        ayuda: 'Con este correo inicia sesión en el panel.',
      },
      {
        nombre: 'password',
        etiqueta: 'Contraseña',
        tipo: 'contrasena',
        ancho: 'medio',
        ayuda: 'Al editar, déjala vacía para conservar la actual.',
      },
      {
        nombre: 'rol',
        etiqueta: 'Rol en el sistema',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Administrador', value: 'admin' },
          { label: 'Gerente', value: 'gerente' },
          { label: 'Cajero', value: 'cajero' },
          { label: 'Mesero', value: 'mesero' },
          { label: 'Cocina', value: 'cocina' },
        ],
      },
      { nombre: 'puesto', etiqueta: 'Puesto', tipo: 'texto', ancho: 'medio' },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 'medio' },
      { nombre: 'tarifaHora', etiqueta: 'Tarifa por hora', tipo: 'numero', ancho: 'medio', paso: 0.01 },
      { nombre: 'notas', etiqueta: 'Notas internas', tipo: 'textarea' },
      { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano', ancho: 'medio' },
    ],
  },

  categorias: {
    coleccion: 'categorias',
    singular: 'Categoría',
    plural: 'Categorías',
    descripcion: 'Agrupan los platillos y definen el orden en que aparecen en la carta.',
    ruta: '/panel/carta',
    ordenPor: 'orden',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Nombre' },
      { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero' },
      { nombre: 'activa', etiqueta: 'Visible', tipo: 'booleano' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'icono', etiqueta: 'Ícono (emoji)', tipo: 'texto', ancho: 'medio', placeholder: '🍕' },
      { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero', ancho: 'medio' },
      {
        nombre: 'descripcion',
        etiqueta: 'Descripción',
        tipo: 'textarea',
        ayuda: 'Aparece debajo del nombre en la carta pública.',
      },
      { nombre: 'activa', etiqueta: 'Visible en la carta', tipo: 'booleano', ancho: 'medio' },
    ],
  },

  ingredientes: {
    coleccion: 'ingredientes',
    singular: 'Ingrediente',
    plural: 'Ingredientes',
    descripcion: 'Existencias, costos y mínimos de cada insumo del almacén.',
    ruta: '/panel/inventario',
    ordenPor: 'nombre',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Ingrediente' },
      { nombre: 'stockActual', etiqueta: 'Existencia', tipo: 'numero' },
      { nombre: 'unidad', etiqueta: 'Unidad' },
      { nombre: 'stockMinimo', etiqueta: 'Mínimo', tipo: 'numero' },
      { nombre: 'costoUnitario', etiqueta: 'Costo', tipo: 'moneda' },
      { nombre: 'valorInventario', etiqueta: 'Valor', tipo: 'moneda' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'sku', etiqueta: 'Código interno', tipo: 'texto', ancho: 'medio' },
      {
        nombre: 'unidad',
        etiqueta: 'Unidad',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Gramos (g)', value: 'g' },
          { label: 'Kilogramos (kg)', value: 'kg' },
          { label: 'Mililitros (ml)', value: 'ml' },
          { label: 'Litros (l)', value: 'l' },
          { label: 'Unidad', value: 'unidad' },
          { label: 'Porción', value: 'porcion' },
        ],
      },
      {
        nombre: 'categoria',
        etiqueta: 'Familia',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Abarrote', value: 'abarrote' },
          { label: 'Carnes', value: 'carnes' },
          { label: 'Verduras y frutas', value: 'vegetales' },
          { label: 'Lácteos', value: 'lacteos' },
          { label: 'Bebidas', value: 'bebidas' },
          { label: 'Desechables', value: 'desechables' },
          { label: 'Limpieza', value: 'limpieza' },
        ],
      },
      { nombre: 'stockActual', etiqueta: 'Existencia actual', tipo: 'numero', ancho: 'medio', paso: 0.001 },
      { nombre: 'stockMinimo', etiqueta: 'Mínimo deseado', tipo: 'numero', ancho: 'medio', paso: 0.001 },
      { nombre: 'stockMaximo', etiqueta: 'Máximo', tipo: 'numero', ancho: 'medio', paso: 0.001 },
      { nombre: 'costoUnitario', etiqueta: 'Costo por unidad', tipo: 'numero', ancho: 'medio', paso: 0.01 },
      { nombre: 'proveedor', etiqueta: 'Proveedor principal', tipo: 'relacion', fuente: 'proveedores', ancho: 'medio' },
      { nombre: 'ubicacion', etiqueta: 'Ubicación en almacén', tipo: 'texto', ancho: 'medio' },
      { nombre: 'perecedero', etiqueta: 'Es perecedero', tipo: 'booleano', ancho: 'medio' },
      { nombre: 'vidaUtilDias', etiqueta: 'Vida útil (días)', tipo: 'numero', ancho: 'medio' },
      OPCIONES_ACTIVO,
    ],
  },

  proveedores: {
    coleccion: 'proveedores',
    singular: 'Proveedor',
    plural: 'Proveedores',
    ruta: '/panel/inventario/proveedores',
    ordenPor: 'nombre',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Proveedor' },
      { nombre: 'contacto', etiqueta: 'Contacto' },
      { nombre: 'telefono', etiqueta: 'Teléfono' },
      { nombre: 'condicionesPago', etiqueta: 'Pago' },
      { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', ancho: 'medio' },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 'medio' },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'texto', ancho: 'medio' },
      {
        nombre: 'condicionesPago',
        etiqueta: 'Condiciones de pago',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Contado', value: 'contado' },
          { label: '15 días', value: '15_dias' },
          { label: '30 días', value: '30_dias' },
          { label: '60 días', value: '60_dias' },
        ],
      },
      { nombre: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
      { nombre: 'diasEntrega', etiqueta: 'Días de entrega', tipo: 'texto', ancho: 'medio' },
      { nombre: 'notas', etiqueta: 'Notas', tipo: 'textarea' },
      OPCIONES_ACTIVO,
    ],
  },

  zonas: {
    coleccion: 'zonas',
    singular: 'Zona',
    plural: 'Zonas del salón',
    ruta: '/panel/mesas',
    ordenPor: 'orden',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Zona' },
      { nombre: 'descripcion', etiqueta: 'Descripción' },
      { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero' },
      { nombre: 'activa', etiqueta: 'Activa', tipo: 'booleano' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'color', etiqueta: 'Color', tipo: 'texto', ancho: 'medio', ayuda: 'Hexadecimal, ej. #0ea5e9' },
      { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero', ancho: 'medio' },
      { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto' },
      { nombre: 'activa', etiqueta: 'Activa', tipo: 'booleano', ancho: 'medio' },
    ],
  },

  mesas: {
    coleccion: 'mesas',
    singular: 'Mesa',
    plural: 'Mesas',
    descripcion: 'El slug de cada mesa es lo que se codifica en su código QR.',
    ruta: '/panel/mesas',
    ordenPor: 'nombre',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Mesa' },
      { nombre: 'slug', etiqueta: 'Slug del QR' },
      { nombre: 'zona', etiqueta: 'Zona' },
      { nombre: 'capacidad', etiqueta: 'Lugares', tipo: 'numero' },
      { nombre: 'estado', etiqueta: 'Estado' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, placeholder: 'Mesa 9' },
      { nombre: 'zona', etiqueta: 'Zona', tipo: 'relacion', fuente: 'zonas', ancho: 'medio' },
      { nombre: 'capacidad', etiqueta: 'Capacidad', tipo: 'numero', ancho: 'medio' },
      {
        nombre: 'forma',
        etiqueta: 'Forma',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Cuadrada', value: 'cuadrada' },
          { label: 'Redonda', value: 'redonda' },
          { label: 'Rectangular', value: 'rectangular' },
          { label: 'Barra', value: 'barra' },
        ],
      },
      {
        nombre: 'estado',
        etiqueta: 'Estado',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Libre', value: 'libre' },
          { label: 'Ocupada', value: 'ocupada' },
          { label: 'Reservada', value: 'reservada' },
          { label: 'Por limpiar', value: 'limpieza' },
          { label: 'Fuera de servicio', value: 'fuera_servicio' },
        ],
      },
      { nombre: 'posicionX', etiqueta: 'Posición horizontal (%)', tipo: 'numero', ancho: 'medio', min: 0, max: 100 },
      { nombre: 'posicionY', etiqueta: 'Posición vertical (%)', tipo: 'numero', ancho: 'medio', min: 0, max: 100 },
      { nombre: 'notas', etiqueta: 'Notas', tipo: 'texto' },
      { nombre: 'activa', etiqueta: 'Activa', tipo: 'booleano', ancho: 'medio' },
    ],
  },

  cupones: {
    coleccion: 'cupones',
    singular: 'Cupón',
    plural: 'Cupones',
    ruta: '/panel/marketing',
    ordenPor: '-createdAt',
    columnas: [
      { nombre: 'codigo', etiqueta: 'Código' },
      { nombre: 'tipo', etiqueta: 'Tipo' },
      { nombre: 'valor', etiqueta: 'Valor', tipo: 'numero' },
      { nombre: 'minimoCompra', etiqueta: 'Mínimo', tipo: 'moneda' },
      { nombre: 'usosActuales', etiqueta: 'Usos', tipo: 'numero' },
      { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano' },
    ],
    campos: [
      { nombre: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, placeholder: 'BIENVENIDO10' },
      { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto' },
      {
        nombre: 'tipo',
        etiqueta: 'Tipo',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Porcentaje', value: 'porcentaje' },
          { label: 'Monto fijo', value: 'monto' },
        ],
      },
      { nombre: 'valor', etiqueta: 'Valor', tipo: 'numero', requerido: true, ancho: 'medio' },
      { nombre: 'minimoCompra', etiqueta: 'Compra mínima', tipo: 'numero', ancho: 'medio' },
      { nombre: 'usosMaximos', etiqueta: 'Usos máximos (0 = ilimitado)', tipo: 'numero', ancho: 'medio' },
      { nombre: 'validoDesde', etiqueta: 'Válido desde', tipo: 'fecha', ancho: 'medio' },
      { nombre: 'validoHasta', etiqueta: 'Válido hasta', tipo: 'fecha', ancho: 'medio' },
      {
        nombre: 'canales',
        etiqueta: 'Canales aplicables',
        tipo: 'multiselect',
        opciones: [
          { label: 'En mesa', value: 'mesa' },
          { label: 'Mostrador', value: 'mostrador' },
          { label: 'Para llevar', value: 'para_llevar' },
        ],
      },
      { nombre: 'activo', etiqueta: 'Activo', tipo: 'booleano', ancho: 'medio' },
    ],
  },

  recompensas: {
    coleccion: 'recompensas',
    singular: 'Recompensa',
    plural: 'Recompensas',
    ruta: '/panel/clientes',
    ordenPor: 'costoPuntos',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Recompensa' },
      { nombre: 'tipo', etiqueta: 'Tipo' },
      { nombre: 'costoPuntos', etiqueta: 'Puntos', tipo: 'numero' },
      { nombre: 'activa', etiqueta: 'Activa', tipo: 'booleano' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
      {
        nombre: 'tipo',
        etiqueta: 'Tipo',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Platillo gratis', value: 'producto_gratis' },
          { label: 'Descuento por porcentaje', value: 'descuento_porcentaje' },
          { label: 'Descuento por monto', value: 'descuento_monto' },
          { label: 'Puntos extra', value: 'puntos_extra' },
        ],
      },
      { nombre: 'costoPuntos', etiqueta: 'Puntos necesarios', tipo: 'numero', requerido: true, ancho: 'medio' },
      { nombre: 'valorDescuento', etiqueta: 'Valor del descuento', tipo: 'numero', ancho: 'medio' },
      { nombre: 'producto', etiqueta: 'Platillo', tipo: 'relacion', fuente: 'productos', ancho: 'medio' },
      { nombre: 'vigenciaDesde', etiqueta: 'Vigente desde', tipo: 'fecha', ancho: 'medio' },
      { nombre: 'vigenciaHasta', etiqueta: 'Vigente hasta', tipo: 'fecha', ancho: 'medio' },
      { nombre: 'activa', etiqueta: 'Activa', tipo: 'booleano', ancho: 'medio' },
    ],
  },

  campanas: {
    coleccion: 'campanas',
    singular: 'Campaña',
    plural: 'Campañas',
    ruta: '/panel/marketing',
    ordenPor: '-createdAt',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Campaña' },
      { nombre: 'canal', etiqueta: 'Canal' },
      { nombre: 'segmento', etiqueta: 'Segmento' },
      { nombre: 'estado', etiqueta: 'Estado' },
      { nombre: 'enviados', etiqueta: 'Enviados', tipo: 'numero' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      {
        nombre: 'canal',
        etiqueta: 'Canal',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Correo electrónico', value: 'email' },
          { label: 'SMS', value: 'sms' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Push', value: 'push' },
        ],
      },
      {
        nombre: 'segmento',
        etiqueta: 'Segmento',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Todos los clientes', value: 'todos' },
          { label: 'VIP', value: 'vip' },
          { label: 'Frecuentes', value: 'frecuente' },
          { label: 'Inactivos (+60 días)', value: 'inactivo' },
          { label: 'Cumpleaños del mes', value: 'cumpleanos' },
          { label: 'Nuevos (1 visita)', value: 'nuevo' },
        ],
      },
      { nombre: 'asunto', etiqueta: 'Asunto (correo)', tipo: 'texto' },
      { nombre: 'mensaje', etiqueta: 'Mensaje', tipo: 'textarea', ayuda: 'Puedes usar {nombre} para personalizar.' },
      { nombre: 'cupon', etiqueta: 'Cupón incluido', tipo: 'relacion', fuente: 'cupones', ancho: 'medio' },
      {
        nombre: 'estado',
        etiqueta: 'Estado',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Borrador', value: 'borrador' },
          { label: 'Programada', value: 'programada' },
          { label: 'Enviada', value: 'enviada' },
          { label: 'Cancelada', value: 'cancelada' },
        ],
      },
      { nombre: 'programadaPara', etiqueta: 'Programada para', tipo: 'fecha', conHora: true, ancho: 'medio' },
    ],
  },

  clientes: {
    coleccion: 'clientes',
    singular: 'Cliente',
    plural: 'Clientes',
    descripcion: 'Historial, puntos de lealtad y consentimiento de marketing.',
    ruta: '/panel/clientes',
    ordenPor: '-totalGastado',
    columnas: [
      { nombre: 'nombre', etiqueta: 'Cliente' },
      { nombre: 'telefono', etiqueta: 'Teléfono' },
      { nombre: 'nivel', etiqueta: 'Nivel' },
      { nombre: 'puntos', etiqueta: 'Puntos', tipo: 'numero' },
      { nombre: 'visitas', etiqueta: 'Visitas', tipo: 'numero' },
      { nombre: 'totalGastado', etiqueta: 'Gasto', tipo: 'moneda' },
      { nombre: 'ultimaVisita', etiqueta: 'Última visita', tipo: 'fecha' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 'medio' },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'texto', ancho: 'medio' },
      { nombre: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', ancho: 'medio' },
      { nombre: 'direccion', etiqueta: 'Dirección', tipo: 'texto', ancho: 'medio' },
      {
        nombre: 'etiquetas',
        etiqueta: 'Etiquetas',
        tipo: 'multiselect',
        opciones: [
          { label: 'VIP', value: 'vip' },
          { label: 'Frecuente', value: 'frecuente' },
          { label: 'Nuevo', value: 'nuevo' },
          { label: 'Inactivo', value: 'inactivo' },
          { label: 'Cumpleaños este mes', value: 'cumpleanos' },
          { label: 'Corporativo', value: 'corporativo' },
        ],
      },
      { nombre: 'puntos', etiqueta: 'Puntos', tipo: 'numero', ancho: 'medio' },
      { nombre: 'aceptaMarketing', etiqueta: 'Acepta promociones', tipo: 'booleano', ancho: 'medio' },
      { nombre: 'notas', etiqueta: 'Notas y preferencias', tipo: 'textarea' },
    ],
  },

  turnos: {
    coleccion: 'turnos',
    singular: 'Turno',
    plural: 'Turnos',
    ruta: '/panel/personal',
    ordenPor: 'fecha',
    columnas: [
      { nombre: 'empleado', etiqueta: 'Empleado' },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
      { nombre: 'horaInicio', etiqueta: 'Entrada' },
      { nombre: 'horaFin', etiqueta: 'Salida' },
      { nombre: 'puesto', etiqueta: 'Puesto' },
      { nombre: 'estado', etiqueta: 'Estado' },
    ],
    campos: [
      { nombre: 'empleado', etiqueta: 'Empleado', tipo: 'relacion', fuente: 'usuarios', requerido: true, ancho: 'medio' },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, ancho: 'medio' },
      { nombre: 'horaInicio', etiqueta: 'Entrada', tipo: 'texto', requerido: true, ancho: 'medio', placeholder: '09:00' },
      { nombre: 'horaFin', etiqueta: 'Salida', tipo: 'texto', requerido: true, ancho: 'medio', placeholder: '17:00' },
      {
        nombre: 'puesto',
        etiqueta: 'Puesto del turno',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Gerente', value: 'gerente' },
          { label: 'Cajero', value: 'cajero' },
          { label: 'Mesero', value: 'mesero' },
          { label: 'Cocina', value: 'cocina' },
          { label: 'Barra', value: 'barra' },
          { label: 'Anfitrión', value: 'anfitrion' },
        ],
      },
      {
        nombre: 'estado',
        etiqueta: 'Estado',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Programado', value: 'programado' },
          { label: 'Confirmado', value: 'confirmado' },
          { label: 'Completado', value: 'completado' },
          { label: 'Ausente', value: 'ausente' },
        ],
      },
      { nombre: 'notas', etiqueta: 'Notas', tipo: 'texto' },
    ],
  },

  reservaciones: {
    coleccion: 'reservaciones',
    singular: 'Reservación',
    plural: 'Reservaciones',
    ruta: '/panel/reservas',
    ordenPor: 'fecha',
    columnas: [
      { nombre: 'nombreCliente', etiqueta: 'Cliente' },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
      { nombre: 'hora', etiqueta: 'Hora' },
      { nombre: 'personas', etiqueta: 'Personas', tipo: 'numero' },
      { nombre: 'mesa', etiqueta: 'Mesa' },
      { nombre: 'estado', etiqueta: 'Estado' },
    ],
    campos: [
      { nombre: 'nombreCliente', etiqueta: 'Nombre del cliente', tipo: 'texto', requerido: true },
      { nombre: 'cliente', etiqueta: 'Cliente registrado', tipo: 'relacion', fuente: 'clientes', ancho: 'medio' },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 'medio' },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, ancho: 'medio' },
      { nombre: 'hora', etiqueta: 'Hora', tipo: 'texto', requerido: true, ancho: 'medio', placeholder: '20:30' },
      { nombre: 'personas', etiqueta: 'Personas', tipo: 'numero', requerido: true, ancho: 'medio' },
      { nombre: 'mesa', etiqueta: 'Mesa asignada', tipo: 'relacion', fuente: 'mesas', ancho: 'medio' },
      { nombre: 'zona', etiqueta: 'Zona preferida', tipo: 'relacion', fuente: 'zonas', ancho: 'medio' },
      {
        nombre: 'estado',
        etiqueta: 'Estado',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Pendiente', value: 'pendiente' },
          { label: 'Confirmada', value: 'confirmada' },
          { label: 'Cliente en mesa', value: 'sentada' },
          { label: 'Completada', value: 'completada' },
          { label: 'Cancelada', value: 'cancelada' },
          { label: 'No se presentó', value: 'no_asistio' },
        ],
      },
      {
        nombre: 'ocasion',
        etiqueta: 'Ocasión',
        tipo: 'select',
        ancho: 'medio',
        opciones: [
          { label: 'Ninguna en especial', value: 'ninguna' },
          { label: 'Cumpleaños', value: 'cumpleanos' },
          { label: 'Aniversario', value: 'aniversario' },
          { label: 'Comida de negocios', value: 'negocios' },
          { label: 'Celebración', value: 'celebracion' },
        ],
      },
      { nombre: 'notas', etiqueta: 'Notas y peticiones especiales', tipo: 'textarea' },
    ],
  },

  movimientos: {
    coleccion: 'movimientos-inventario',
    singular: 'Movimiento',
    plural: 'Movimientos de inventario',
    descripcion: 'Entradas, mermas, ajustes y consumo automático por ventas.',
    ruta: '/panel/inventario/movimientos',
    ordenPor: '-fecha',
    columnas: [
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fechaHora' },
      { nombre: 'ingrediente', etiqueta: 'Ingrediente' },
      { nombre: 'tipo', etiqueta: 'Tipo' },
      { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero' },
      { nombre: 'motivo', etiqueta: 'Motivo' },
    ],
    campos: [
      { nombre: 'ingrediente', etiqueta: 'Ingrediente', tipo: 'relacion', fuente: 'ingredientes', requerido: true, ancho: 'medio' },
      {
        nombre: 'tipo',
        etiqueta: 'Tipo',
        tipo: 'select',
        requerido: true,
        ancho: 'medio',
        opciones: [
          { label: 'Entrada (compra)', value: 'entrada' },
          { label: 'Salida manual', value: 'salida' },
          { label: 'Ajuste de existencia', value: 'ajuste' },
          { label: 'Merma', value: 'merma' },
          { label: 'Devolución', value: 'devolucion' },
        ],
      },
      { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true, ancho: 'medio', paso: 0.001 },
      { nombre: 'costoUnitario', etiqueta: 'Costo unitario', tipo: 'numero', ancho: 'medio', paso: 0.01 },
      { nombre: 'motivo', etiqueta: 'Motivo', tipo: 'texto' },
    ],
  },
} satisfies Record<string, DefinicionRecurso>

export type ClaveRecurso = keyof typeof RECURSOS

export const obtenerRecurso = (clave: string): DefinicionRecurso | undefined =>
  (RECURSOS as Record<string, DefinicionRecurso>)[clave]
