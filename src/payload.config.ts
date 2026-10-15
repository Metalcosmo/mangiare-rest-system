import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

// Personal y accesos
import { Users } from './collections/Users'
import { Turnos } from './collections/Turnos'
// Medios
import { Media } from './collections/Media'
// Carta y menú
import { Categorias } from './collections/Categorias'
import { Productos } from './collections/Productos'
import { GruposModificadores } from './collections/GruposModificadores'
// Salón
import { Zonas } from './collections/Zonas'
import { Mesas } from './collections/Mesas'
import { SesionesMesa } from './collections/SesionesMesa'
// Pedidos
import { Pedidos } from './collections/Pedidos'
// Inventario
import { Ingredientes } from './collections/Ingredientes'
import { Proveedores } from './collections/Proveedores'
import { MovimientosInventario } from './collections/MovimientosInventario'
// CRM, lealtad y marketing
import { Clientes } from './collections/Clientes'
import { Recompensas } from './collections/Recompensas'
import { Cupones } from './collections/Cupones'
import { Campanas } from './collections/Campanas'
// Reservas
import { Reservaciones } from './collections/Reservaciones'
// Configuración
import { Ajustes } from './globals/Ajustes'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined
  } catch {
    return undefined
  }
}

const isCLI = process.argv.some((value) => {
  const resolved = realpath(value)
  if (!resolved) return false
  return (
    resolved.endsWith(path.join('payload', 'bin.js')) ||
    resolved.endsWith(path.join('next', 'dist', 'bin', 'next'))
  )
})
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => { },
} as any // Use PayloadLogger type when it's exported

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '· Mangiare',
      description: 'Plataforma de operación para restaurantes',
    },
  },
  // La interfaz del personal vive en /panel; el admin de Payload queda como
  // respaldo técnico para depuración de datos.
  collections: [
    Users,
    Turnos,
    Media,
    Categorias,
    Productos,
    GruposModificadores,
    Zonas,
    Mesas,
    SesionesMesa,
    Pedidos,
    Ingredientes,
    Proveedores,
    MovimientosInventario,
    Clientes,
    Recompensas,
    Cupones,
    Campanas,
    Reservaciones,
  ],
  globals: [Ajustes],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  i18n: {
    supportedLanguages: { es },
    fallbackLanguage: 'es',
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  logger: isProduction ? cloudflareLogger : undefined,
  telemetry: false,
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
