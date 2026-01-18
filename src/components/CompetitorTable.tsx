'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CompetitorProduct } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface CompetitorTableProps {
    competitors: CompetitorProduct[];
}

export function CompetitorTable({ competitors }: CompetitorTableProps) {
    // Calculate competitive status for each competitor
    const getCompetitiveStatus = (competitor: CompetitorProduct, allCompetitors: CompetitorProduct[]) => {
        const allPrices = allCompetitors.map(c => c.price);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
        
        if (competitor.price === minPrice) {
            return { status: 'cheapest', color: '#f43f5e' }; // You are cheapest
        } else if (competitor.price <= avgPrice * 1.1) {
            return { status: 'slightly-higher', color: '#f43f5e' }; // Slightly higher
        } else {
            return { status: 'overpriced', color: '#f43f5e' }; // Overpriced
        }
    };

    return (
        <div className="rounded-2xl border border-[#1F2937] bg-[#111827] overflow-hidden">
            <Table>
                <TableHeader className="bg-[#111827] border-b border-[#1F2937]">
                    <TableRow className="border-[#1F2937] hover:bg-transparent">
                        <TableHead className="text-[#6B7280] font-medium h-12">Brand & Product</TableHead>
                        <TableHead className="text-[#6B7280] font-medium h-12">Price</TableHead>
                        <TableHead className="text-[#6B7280] font-medium h-12">Status</TableHead>
                        <TableHead className="text-[#6B7280] font-medium h-12">Match</TableHead>
                        <TableHead className="text-[#6B7280] font-medium h-12">Store</TableHead>
                        <TableHead className="text-[#6B7280] font-medium h-12 text-right">Notes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {competitors.map((competitor, idx) => {
                        const competitiveStatus = getCompetitiveStatus(competitor, competitors);
                        return (
                        <TableRow key={idx} className="border-[#1F2937] hover:bg-[#0B0F1A] transition-colors group">
                            <TableCell className="py-4">
                                <div className="flex flex-col">
                                    <span className="text-[#E5E7EB] font-semibold">{competitor.brand}</span>
                                    <span className="text-xs text-[#9CA3AF] group-hover:text-[#E5E7EB] transition-colors">{competitor.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-[#E5E7EB] font-medium py-4">
                                ${competitor.price.toLocaleString()} <span className="text-[10px] text-[#6B7280]">{competitor.currency}</span>
                            </TableCell>
                            <TableCell className="py-4">
                                <Badge 
                                    className="text-xs font-semibold px-2 py-1"
                                    style={{ 
                                        backgroundColor: `${competitiveStatus.color}20`,
                                        color: competitiveStatus.color,
                                        borderColor: competitiveStatus.color
                                    }}
                                >
                                    {competitiveStatus.status === 'cheapest' ? 'Cheapest' : 
                                     competitiveStatus.status === 'slightly-higher' ? 'Slightly Higher' : 
                                     'Overpriced'}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1 rounded-full bg-[#1F2937]">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ 
                                                width: `${Math.round(competitor.similarityScore * 100)}%`,
                                                backgroundColor: '#f43f5e'
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-[#9CA3AF]">
                                        {Math.round(competitor.similarityScore * 100)}%
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <a
                                    href={competitor.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#9CA3AF] hover:text-[#f43f5e] transition-colors inline-flex items-center gap-1 text-xs"
                                >
                                    View Store
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </TableCell>
                            <TableCell className="text-right text-xs text-[#9CA3AF] max-w-[240px] truncate py-4">
                                {competitor.matchReason}
                            </TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
