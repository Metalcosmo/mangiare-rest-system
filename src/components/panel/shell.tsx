'use client'

import { LogOut, Menu as MenuIcon, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { cerrarSesion } from '@/actions/sesion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { iniciales } from '@/lib/formato'
import { ETIQUETA_ROL, puedeVer, type ClavePermiso } from '@/lib/roles'
import { cn } from '@/lib/utils'

import { NAVEGACION, type ContadoresNav } from './navegacion'

export type UsuarioShell = {
  nombre: string
  email: string
  rol: string
  puesto?: string | null
}

export type MarcaShell = {
  nombre: string
  colorPrimario: string
  colorSecundario: string
}

type Props = {
  usuario: UsuarioShell
  marca: MarcaShell
  /** Contadores en vivo que se pintan como badge en la navegación. */
  contadores?: ContadoresNav
  children: ReactNode
}

const tieneAcceso = (rol: string, permiso: ClavePermiso) =>
  (puedeVer[permiso] ?? []).includes(rol as never)

function Navegacion({
  rol,
  contadores,
  onNavegar,
}: {
  rol: string
  contadores?: ContadoresNav
  onNavegar?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAVEGACION.map((grupo) => {
        const items = grupo.items.filter((item) => tieneAcceso(rol, item.permiso))
        if (items.length === 0) return null

        return (
          <div key={grupo.grupo} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {grupo.grupo}
            </p>
            {items.map((item) => {
              const activo =
                item.href === '/panel'
                  ? pathname === '/panel'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              const pendientes = item.contador ? (contadores?.[item.contador] ?? 0) : 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavegar}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    activo
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <item.icono className="size-4 shrink-0" />
                  <span className="truncate">{item.etiqueta}</span>
                  {pendientes > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 justify-center rounded-full bg-destructive px-1.5 text-[10px] text-white">
                      {pendientes > 99 ? '99+' : pendientes}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

export function Shell({ usuario, marca, contadores, children }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div
      className="flex min-h-screen bg-background"
      style={
        {
          '--primary': marca.colorPrimario,
          '--ring': marca.colorPrimario,
          '--sidebar-primary': marca.colorPrimario,
          '--sidebar-ring': marca.colorPrimario,
          '--foreground': marca.colorSecundario,
        } as React.CSSProperties
      }
    >
      {/* Barra lateral de escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{marca.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">Panel de operación</p>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <Navegacion rol={usuario.rol} contadores={contadores} />
        </ScrollArea>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <MenuUsuario usuario={usuario} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-8">
          <Sheet open={abierto} onOpenChange={setAbierto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <MenuIcon className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5 text-left">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <UtensilsCrossed className="size-5" />
                </span>
                <span className="text-sm font-semibold">{marca.nombre}</span>
              </SheetTitle>
              <ScrollArea className="h-[calc(100vh-4rem)]">
                <Navegacion
                  rol={usuario.rol}
                  contadores={contadores}
                  onNavegar={() => setAbierto(false)}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <UtensilsCrossed className="size-4" />
            </span>
            <p className="truncate text-sm font-medium text-muted-foreground">
              {marca.nombre} · {usuario.puesto || ETIQUETA_ROL[usuario.rol] || 'Equipo'}
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href={usuario.rol === 'mesero' ? '/panel/mesero' : '/panel/pos'}>Nuevo pedido</Link>
          </Button>

          <div className="lg:hidden">
            <MenuUsuario usuario={usuario} soloAvatar />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

function MenuUsuario({
  usuario,
  soloAvatar = false,
}: {
  usuario: UsuarioShell
  soloAvatar?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent',
            soloAvatar && 'w-auto p-0 hover:bg-transparent',
          )}
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {iniciales(usuario.nombre)}
            </AvatarFallback>
          </Avatar>
          {!soloAvatar && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{usuario.nombre}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {usuario.email}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-medium">{usuario.nombre}</span>
          <Badge variant="secondary" className="w-fit text-[10px]">
            {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/panel/ajustes">Ajustes del restaurante</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank">
            Ver carta pública
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={cerrarSesion}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer text-destructive">
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
