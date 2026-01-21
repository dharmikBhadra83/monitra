'use client';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CompetitorProduct, ProductDNA } from '@/lib/types';

interface PriceChartProps {
    report: {
        targetProduct: ProductDNA;
        competitors: CompetitorProduct[];
    };
}

export function PriceChart({ report }: PriceChartProps) {
    const data = [
        {
            name: `Your Brand (${report.targetProduct.brand})`,
            price: report.targetProduct.price,
            isTarget: true,
        },
        ...report.competitors.map((c) => ({
            name: `${c.brand} - ${c.name}`,
            price: c.price,
            isTarget: false,
        })),
    ].sort((a, b) => a.price - b.price);

    return (
        <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" opacity={0.4} />
                    <XAxis
                        dataKey="name"
                        hide
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        fontSize={11}
                        fontWeight={500}
                        tickFormatter={(value) => `$${value}`}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip
                        cursor={{ fill: '#1F2937', opacity: 0.3 }}
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: '1px solid #1F2937',
                            borderRadius: '12px',
                            padding: '8px 12px'
                        }}
                        itemStyle={{ color: '#F9FAFB', fontSize: '13px', fontWeight: '600' }}
                        labelStyle={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '4px' }}
                        formatter={(value: number | undefined) => [`$${value?.toLocaleString()}`, 'Price']}
                    />
                    <Bar
                        dataKey="price"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isTarget ? '#22c55e' : '#9CA3AF'}
                                className="transition-all duration-300 hover:opacity-80"
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
