'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

export type PuntoVentas = {
  dia: string
  ventas: number
  pedidos: number
}

const configuracion: ChartConfig = {
  ventas: {
    label: 'Ventas',
    color: 'var(--chart-1)',
  },
  pedidos: {
    label: 'Pedidos',
    color: 'var(--chart-3)',
  },
}

export function GraficoVentas({ datos }: { datos: PuntoVentas[] }) {
  return (
    <ChartContainer config={configuracion} className="h-[260px] w-full">
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} width={48} fontSize={12} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
        <Bar dataKey="ventas" fill="var(--color-ventas)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
