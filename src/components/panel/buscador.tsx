'use client'

import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'

export function Buscador({ placeholder = 'Buscar…' }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()
  const [valor, setValor] = useState(parametros.get('q') ?? '')

  useEffect(() => {
    const actual = parametros.get('q') ?? ''
    if (valor === actual) return

    const temporizador = setTimeout(() => {
      const nuevos = new URLSearchParams(parametros.toString())
      if (valor) nuevos.set('q', valor)
      else nuevos.delete('q')
      router.replace(`${pathname}?${nuevos.toString()}`)
    }, 350)

    return () => clearTimeout(temporizador)
  }, [valor, parametros, pathname, router])

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}
