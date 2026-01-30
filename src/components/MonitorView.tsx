'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { convertFromUSD, formatPrice } from '@/lib/currency';
import { Monitor, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PriceChange {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  difference: number;
  differencePercent: number;
  timestamp: string;
}

export function MonitorView({ selectedCurrency }: { selectedCurrency: string }) {
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'low-to-high' | 'high-to-low'>('low-to-high');

  const fetchPriceChanges = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/monitor');
      if (response.ok) {
        const data = await response.json();
        setPriceChanges(data.priceChanges || []);
      }
    } catch (err) {
      console.error('Failed to fetch price changes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceChanges();
  }, []);

  // Sort price changes based on selected order
  const sortedPriceChanges = [...priceChanges].sort((a, b) => {
    if (sortOrder === 'low-to-high') {
      return a.newPrice - b.newPrice;
    } else {
      return b.newPrice - a.newPrice;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-black-bg)] text-[var(--color-black-text)]">
        <div className="container mx-auto px-6 py-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--color-black-border)] border-t-[var(--color-red-primary)] mx-auto animate-spin" />
              <p className="text-[var(--color-black-text-muted)]">Loading price changes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-black-bg)] text-[var(--color-black-text)]">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-black-border)] bg-[var(--color-black-bg)]/95 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-black-text)] mb-2">Price Monitor</h1>
              <p className="text-[var(--color-black-text-muted)]">Track price changes for your products</p>
            </div>
            <Button onClick={fetchPriceChanges} variant="outline" size="sm" className="border-[var(--color-black-border)]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-4">
            <label className="text-xs text-[var(--color-black-text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-[var(--color-black-text-muted)]" />
              Sort by Price
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'low-to-high' | 'high-to-low')}
              className="px-4 py-2 rounded-lg bg-[var(--color-black-card)] border border-[var(--color-black-border)] text-[var(--color-black-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] hover:bg-[var(--color-black-card-hover)] transition-colors h-11"
            >
              <option value="low-to-high">Price Low to High</option>
              <option value="high-to-low">Price High to Low</option>
            </select>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-black-text-secondary)]">Total Changes:</span>
              <span className="font-semibold text-[var(--color-black-text)]">{priceChanges.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10">
        {priceChanges.length === 0 ? (
          <div className="text-center py-20">
            <Monitor className="w-16 h-16 text-[var(--color-black-text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--color-black-text-muted)] text-lg mb-2">No price changes detected</p>
            <p className="text-sm text-[var(--color-black-text-secondary)]">Price changes will appear here after the daily cron job runs</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-black-border)] bg-[var(--color-black-card)] overflow-hidden">
            <Table>
              <TableHeader className="bg-[var(--color-black-bg)]">
                <TableRow className="border-[var(--color-black-border)] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Product Name</TableHead>
                  <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] text-right">Old Price</TableHead>
                  <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] text-right">New Price</TableHead>
                  <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] text-right">Difference %</TableHead>
                  <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] text-right">Changed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPriceChanges.map((change) => {
                  const oldPriceDisplay = convertFromUSD(change.oldPrice, selectedCurrency);
                  const newPriceDisplay = convertFromUSD(change.newPrice, selectedCurrency);
                  const isIncrease = change.differencePercent > 0;
                  const changedAt = new Date(change.timestamp).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <TableRow
                      key={change.productId}
                      className="border-[var(--color-black-border)] hover:bg-[var(--color-black-card-hover)] transition-colors"
                    >
                      <TableCell className="font-bold text-[var(--color-black-text)] py-4">
                        {change.productName}
                      </TableCell>
                      <TableCell className="text-right text-[var(--color-black-text-muted)] py-4 tabular-nums">
                        {formatPrice(oldPriceDisplay, selectedCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[var(--color-black-text)] py-4 tabular-nums">
                        {formatPrice(newPriceDisplay, selectedCurrency)}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className={`flex items-center justify-end gap-1 font-bold ${
                          isIncrease 
                            ? 'text-[var(--color-red-primary)]' 
                            : 'text-green-500'
                        }`}>
                          {isIncrease ? (
                            <TrendingUp className="w-4 h-4 shrink-0" />
                          ) : (
                            <TrendingDown className="w-4 h-4 shrink-0" />
                          )}
                          <span>{Math.abs(change.differencePercent).toFixed(2)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[var(--color-black-text-muted)] text-sm py-4 whitespace-nowrap">
                        {changedAt}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
