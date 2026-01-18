'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package } from 'lucide-react';

interface DashboardViewProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
  selectedCurrency: string;
}

export function DashboardView({
  data,
  loading,
  onRefresh,
  selectedCurrency
}: DashboardViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-red-primary)] mx-auto" />
          <p className="text-[var(--color-black-text-muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Package className="w-16 h-16 text-[var(--color-black-text-muted)] mx-auto" />
          <p className="text-[var(--color-black-text-muted)]">No dashboard data available</p>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--color-black-text)]">Dashboard</h2>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      {/* Add your dashboard content here */}
      <Card className="p-6">
        <p className="text-[var(--color-black-text-muted)]">Dashboard content coming soon...</p>
      </Card>
    </div>
  );
}
