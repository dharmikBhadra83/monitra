'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Package,
  Target,
  TrendingUp,
  Activity,
  ArrowUpRight,
  AlertCircle,
  TrendingDown,
  AlertTriangle,
  Zap,
  DollarSign
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { convertFromUSD, formatPrice } from '@/lib/currency';

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

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-[var(--color-black-border)] border-t-[var(--color-red-primary)] mx-auto"
          />
          <p className="text-[var(--color-black-text-muted)]">Analyzing market data...</p>
        </div>
      </div>
    );
  }

  // No Data State
  if (!data || (!data.kpi?.totalProducts && !data.recentActivity?.length)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-[var(--color-black-card-hover)] p-6 rounded-full">
          <Package className="w-12 h-12 text-[var(--color-black-text-muted)]" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-xl font-bold text-[var(--color-black-text)] mb-2">No Data Available</h3>
          <p className="text-[var(--color-black-text-muted)] mb-6">
            Start tracking products to see competitive insights, price alerts, and market analysis here.
          </p>
          {/* onRefresh removed as per request for "Refresh Button" removal in header, but kept in empty state for usability if needed, or can remove here too. User said "remove the refresh button", likely meaning the main one. */}
        </div>
      </div>
    );
  }

  const { kpi, charts, recentActivity, opportunities, hotActions, segmentation, closeCompetition } = data;

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-black-card)] border border-[var(--color-black-border)] p-3 rounded-lg shadow-xl">
          <p className="font-semibold text-[var(--color-black-text)]">{payload[0].name}</p>
          <p className="text-sm text-[var(--color-black-text-muted)]">
            {payload[0].value} {charts.competitorShare.find((c: any) => c.name === payload[0].payload.name) ? 'Products' : 'Count'}
          </p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--color-black-text)] mb-1">Market Overview</h2>
          <p className="text-[var(--color-black-text-muted)]">Real-time competitive intelligence summary</p>
        </div>
        {/* Refresh button removed as per user request */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-[var(--color-black-card)] border-2 border-[var(--color-black-border)] hover:border-[var(--color-red-primary)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[var(--color-black-card-hover)] rounded-lg">
                <Package className="w-6 h-6 text-[var(--color-red-primary)]" />
              </div>
            </div>
            <h3 className="text-4xl font-bold text-[var(--color-black-text)] mb-1">{kpi.totalProducts}</h3>
            <p className="text-sm text-[var(--color-black-text-muted)]">Active Products Tracked</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-[var(--color-black-card)] border-2 border-[var(--color-black-border)] hover:border-[var(--color-red-primary)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[var(--color-black-card-hover)] rounded-lg">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                {Math.round(kpi.competitorsTracked / (kpi.totalProducts || 1))} per product
              </Badge>
            </div>
            <h3 className="text-4xl font-bold text-[var(--color-black-text)] mb-1">{kpi.competitorsTracked}</h3>
            <p className="text-sm text-[var(--color-black-text-muted)]">Total Competitors Monitored</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-[var(--color-black-card)] border-2 border-[var(--color-black-border)] hover:border-[var(--color-red-primary)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[var(--color-black-card-hover)] rounded-lg">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
              {kpi.priceIndex < 100 ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">Competitive</Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-500/10 text-red-500">Premium</Badge>
              )}
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-4xl font-bold text-[var(--color-black-text)] mb-1">{kpi.priceIndex}</h3>
              <span className="text-sm text-[var(--color-black-text-muted)] mb-3">index</span>
            </div>
            <p className="text-sm text-[var(--color-black-text-muted)]">
              Average vs Market (100 = Parity)
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Hot Actions Today */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-[var(--color-black-card)] border-2 border-red-900/50 hover:border-red-500/50 transition-all col-span-3">
          <h3 className="text-lg font-bold text-[var(--color-black-text)] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Hot Actions Today
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--color-black-card-hover)]/30">
              <div className="p-2 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-black-text)]">{hotActions?.expensiveAlerts || 0}</p>
                <p className="text-sm font-medium text-[var(--color-red-primary)]">Expensive items</p>
                <p className="text-xs text-[var(--color-black-text-muted)] mt-1">Compared to market avg (&gt;10%)</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--color-black-card-hover)]/30">
              <div className="p-2 bg-orange-500/10 rounded-full">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-black-text)]">{hotActions?.unlisted || 0}</p>
                <p className="text-sm font-medium text-orange-500">Unlisted / Out of Stock</p>
                <p className="text-xs text-[var(--color-black-text-muted)] mt-1">Items requiring varying attention</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--color-black-card-hover)]/30">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-black-text)]">{hotActions?.recentChanges || 0}</p>
                <p className="text-sm font-medium text-blue-500">Price Changes Today</p>
                <p className="text-xs text-[var(--color-black-text-muted)] mt-1">Activity across your portfolio</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Market Segmentation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-[var(--color-black-card)] border border-[var(--color-black-border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-black-text-muted)]">Cheapest</p>
            <div className="p-1.5 bg-green-500/10 rounded">
              <TrendingDown className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[var(--color-black-text)]">{segmentation?.cheapest || 0}</h3>
          <p className="text-xs text-[var(--color-black-text-muted)] mt-1">Products lowest in market</p>
        </Card>

        <Card className="p-6 bg-[var(--color-black-card)] border border-[var(--color-black-border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-black-text-muted)]">Mid-Range</p>
            <div className="p-1.5 bg-blue-500/10 rounded">
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[var(--color-black-text)]">{segmentation?.midrange || 0}</h3>
          <p className="text-xs text-[var(--color-black-text-muted)] mt-1">Products in competitive range</p>
        </Card>

        <Card className="p-6 bg-[var(--color-black-card)] border border-[var(--color-black-border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-black-text-muted)]">Expensive</p>
            <div className="p-1.5 bg-red-500/10 rounded">
              <TrendingUp className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[var(--color-black-text)]">{segmentation?.expensive || 0}</h3>
          <p className="text-xs text-[var(--color-black-text-muted)] mt-1">Products highest in market</p>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Market Position Chart */}
          <Card className="p-6 bg-[var(--color-black-card)] border border-[var(--color-black-border)]">
            <h4 className="font-semibold text-[var(--color-black-text)] mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-red-primary)]" />
              Price Position Distribution
            </h4>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.pricePosition}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {charts.pricePosition.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Close Competition List */}
          <Card className="p-6 bg-[var(--color-black-card)] border border-[var(--color-black-border)]">
            <h4 className="font-semibold text-[var(--color-black-text)] mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-yellow-500" />
              Close Competition
              <Badge variant="outline" className="ml-auto border-yellow-500/20 text-yellow-500">
                {closeCompetition?.length || 0}
              </Badge>
            </h4>
            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
              {closeCompetition && closeCompetition.length > 0 ? (
                closeCompetition.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-[120px] text-[var(--color-black-text)]" title={item.name}>{item.name}</span>
                    <div className="text-right">
                      <span className="text-[var(--color-black-text-muted)] text-xs">+{item.percentDiff}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-black-text-muted)] text-center py-4">No close battles found.</p>
              )}
            </div>
          </Card>


          {/* Opportunities List */}
          <Card className="p-6 bg-[var(--color-black-card)] border border-[var(--color-black-border)] md:col-span-2">
            <h4 className="font-semibold text-[var(--color-black-text)] mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Top Pricing Opportunities
              <Badge variant="outline" className="ml-auto border-orange-500/20 text-orange-500">
                {opportunities.length} Products Overpriced
              </Badge>
            </h4>

            <div className="space-y-4">
              {opportunities.length > 0 ? (
                opportunities.map((opp: any) => (
                  <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-black-card-hover)]/50 hover:bg-[var(--color-black-card-hover)] transition-colors border border-transparent hover:border-[var(--color-black-border)]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-black-text)] truncate">{opp.name}</p>
                      <p className="text-xs text-[var(--color-black-text-muted)]">
                        Your Price: <span className="text-[var(--color-red-primary)] font-medium">{formatPrice(convertFromUSD(opp.myPrice, selectedCurrency), selectedCurrency)}</span> vs Best: <span className="text-green-500 font-medium">{formatPrice(convertFromUSD(opp.competitorPrice, selectedCurrency), selectedCurrency)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-500">+{opp.percentDiff}%</p>
                      <p className="text-xs text-[var(--color-black-text-muted)]">Premium</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[var(--color-black-text-muted)]">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No significant pricing gaps found. You are competitive!</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Activity Feed Column */}
        <div className="lg:col-span-1">
          <Card className="h-full bg-[var(--color-black-card)] border border-[var(--color-black-border)] flex flex-col">
            <div className="p-6 border-b border-[var(--color-black-border)]">
              <h4 className="font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--color-red-primary)]" />
                Recent Price Changes
              </h4>
            </div>
            <div className="p-6 flex-1 overflow-y-auto max-h-[500px] space-y-6">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity: any, i: number) => {
                  const isIncrease = activity.newPrice > activity.oldPrice;
                  return (
                    <div key={i} className="relative pl-6 pb-2 last:pb-0">
                      {/* Timeline Line */}
                      <div className="absolute left-0 top-2 bottom-0 w-px bg-[var(--color-black-border)]" />
                      {/* Dot */}
                      <div className={`absolute left-[-4px] top-2 w-2 h-2 rounded-full ${isIncrease ? 'bg-red-500' : 'bg-green-500'}`} />

                      <div className="mb-1">
                        <p className="text-sm font-medium text-[var(--color-black-text)] line-clamp-2">
                          {activity.productName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[var(--color-black-text-muted)] line-through">
                            {formatPrice(convertFromUSD(activity.oldPrice, selectedCurrency), selectedCurrency)}
                          </span>
                          <ArrowUpRight className={`w-3 h-3 ${isIncrease ? 'text-red-500' : 'text-green-500 rotate-90'}`} />
                          <span className={`text-xs font-bold ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                            {formatPrice(convertFromUSD(activity.newPrice, selectedCurrency), selectedCurrency)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--color-black-text-muted)] uppercase tracking-wider">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-[var(--color-black-text-muted)]">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent price movements recorded.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
