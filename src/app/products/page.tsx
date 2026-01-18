'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Award,
  Layers,
  DollarSign,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { convertFromUSD, formatPrice } from '@/lib/currency';
import { Input } from '@/components/ui/input';

export default function ProductsPage() {
  const [productsData, setProductsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rank' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchProductsData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (response.ok) {
        setProductsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, []);

  const toggleExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Filter and sort products
  const filteredAndSortedProducts = productsData?.products
    ? productsData.products
        .filter((product: any) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            product.name.toLowerCase().includes(query) ||
            product.brand.toLowerCase().includes(query) ||
            product.url.toLowerCase().includes(query)
          );
        })
        .sort((a: any, b: any) => {
          let aValue: any, bValue: any;
          
          switch (sortBy) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'price':
              aValue = a.priceUSD || a.latestPrice;
              bValue = b.priceUSD || b.latestPrice;
              break;
            case 'rank':
              aValue = a.priceRank || 999;
              bValue = b.priceRank || 999;
              break;
            case 'updated':
              aValue = new Date(a.updatedAt).getTime();
              bValue = new Date(b.updatedAt).getTime();
              break;
            default:
              return 0;
          }
          
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
          }
        })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-black-bg)] text-[var(--color-black-text)]">
        <div className="container mx-auto px-6 py-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-[var(--color-black-border)] border-t-[var(--color-red-primary)] mx-auto"
              />
              <p className="text-[var(--color-black-text-muted)]">Loading products...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!productsData || !productsData.products || productsData.products.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-black-bg)] text-[var(--color-black-text)]">
        <div className="container mx-auto px-6 py-10">
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-[var(--color-black-text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--color-black-text-muted)] text-lg mb-4">No products available</p>
            <Button onClick={fetchProductsData} variant="outline" className="border-[var(--color-black-border)]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
              <h1 className="text-4xl font-bold text-[var(--color-black-text)] mb-2">Products</h1>
              <p className="text-[var(--color-black-text-muted)]">Manage and analyze all tracked products</p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={fetchProductsData} variant="outline" size="sm" className="border-[var(--color-black-border)]">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </motion.div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-black-text-muted)]" />
              <Input
                type="text"
                placeholder="Search products by name, brand, or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-[var(--color-black-card)] border-[var(--color-black-border)] text-[var(--color-black-text)] placeholder:text-[var(--color-black-text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-red-primary)] focus-visible:border-[var(--color-red-primary)] rounded-lg"
              />
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--color-black-text-muted)]" />
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="px-4 py-2 rounded-lg bg-[var(--color-black-card)] border border-[var(--color-black-border)] text-[var(--color-black-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] hover:bg-[var(--color-black-card-hover)] transition-colors h-11"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--color-black-text-muted)]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 rounded-lg bg-[var(--color-black-card)] border border-[var(--color-black-border)] text-[var(--color-black-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] hover:bg-[var(--color-black-card-hover)] transition-colors h-11"
              >
                <option value="updated">Last Updated</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="rank">Price Rank</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="border-[var(--color-black-border)] h-11 px-3"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-black-text-secondary)]">Total Products:</span>
              <span className="font-semibold text-[var(--color-black-text)]">{filteredAndSortedProducts.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-black-text-secondary)]">Showing:</span>
              <span className="font-semibold text-[var(--color-red-primary)]">{filteredAndSortedProducts.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 gap-6">
          {filteredAndSortedProducts.map((product: any, idx: number) => {
            const isExpanded = expandedProducts.has(product.id);
            const priceUSD = product.priceUSD || product.latestPrice;
            const displayPrice = convertFromUSD(priceUSD, selectedCurrency);
            const avgPrice = convertFromUSD(product.averagePrice || 0, selectedCurrency);
            const minPrice = convertFromUSD(product.priceRange?.min || 0, selectedCurrency);
            const maxPrice = convertFromUSD(product.priceRange?.max || 0, selectedCurrency);
            const difference = convertFromUSD(product.difference || 0, selectedCurrency);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <Card className="card-dark rounded-2xl overflow-hidden border-2 border-[var(--color-black-border)] hover:border-[var(--color-red-border)] transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-start gap-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl.startsWith('http') ? product.imageUrl : `https://${product.imageUrl}`}
                            alt={product.name}
                            className="w-28 h-28 rounded-xl object-cover border-2 border-[var(--color-black-border)]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-28 h-28 rounded-xl bg-[var(--color-black-card-hover)] border-2 border-[var(--color-black-border)] flex items-center justify-center">
                            <Package className="w-12 h-12 text-[var(--color-black-text-muted)]" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-bold text-[var(--color-black-text)] mb-2 line-clamp-2">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-3 flex-wrap mb-3">
                              <Badge className="bg-[var(--color-black-card-hover)] text-[var(--color-black-text)] border-[var(--color-black-border)]">
                                {product.brand}
                              </Badge>
                              <span className="text-sm text-[var(--color-black-text-muted)]">
                                {product.competitorCount || 0} competitors
                              </span>
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--color-red-primary)] hover:text-[var(--color-red-primary)]/80 transition-colors inline-flex items-center gap-1"
                              >
                                View URL <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleExpand(product.id)}
                            className="p-2 rounded-lg hover:bg-[var(--color-black-card-hover)] transition-colors flex-shrink-0"
                          >
                            <ChevronRight
                              className={`w-5 h-5 text-[var(--color-black-text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </motion.button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="space-y-1 p-3 rounded-lg bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)]">
                            <p className="text-xs text-[var(--color-black-text-secondary)] uppercase tracking-wider">Price</p>
                            <p className="text-xl font-bold text-[var(--color-red-primary)]">
                              {formatPrice(displayPrice, selectedCurrency)}
                            </p>
                            <p className="text-xs text-[var(--color-black-text-muted)]">
                              {product.currency} → USD
                            </p>
                          </div>
                          <div className="space-y-1 p-3 rounded-lg bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)]">
                            <p className="text-xs text-[var(--color-black-text-secondary)] uppercase tracking-wider">Price Range</p>
                            <p className="text-sm font-semibold text-[var(--color-black-text)]">
                              {formatPrice(minPrice, selectedCurrency)} - {formatPrice(maxPrice, selectedCurrency)}
                            </p>
                          </div>
                          <div className="space-y-1 p-3 rounded-lg bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)]">
                            <p className="text-xs text-[var(--color-black-text-secondary)] uppercase tracking-wider">Price Rank</p>
                            <div className="flex items-center gap-2">
                              <Award className={`w-5 h-5 ${product.priceRank === 1 ? 'text-[var(--color-red-primary)]' : 'text-[var(--color-black-text-muted)]'}`} />
                              <p className="text-lg font-bold text-[var(--color-black-text)]">
                                #{product.priceRank || 1}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 p-3 rounded-lg bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)]">
                            <p className="text-xs text-[var(--color-black-text-secondary)] uppercase tracking-wider">Average</p>
                            <p className="text-sm font-semibold text-[var(--color-black-text)]">
                              {formatPrice(avgPrice, selectedCurrency)}
                            </p>
                          </div>
                          <div className="space-y-1 p-3 rounded-lg bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)]">
                            <p className="text-xs text-[var(--color-black-text-secondary)] uppercase tracking-wider">Difference</p>
                            <p className={`text-sm font-bold flex items-center gap-1 ${difference >= 0 ? 'text-[var(--color-red-primary)]' : 'text-green-500'}`}>
                              {difference >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {formatPrice(Math.abs(difference), selectedCurrency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Breakdown */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-6 pt-6 border-t border-[var(--color-black-border)] overflow-hidden"
                        >
                          <h4 className="text-base font-semibold text-[var(--color-black-text)] mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-[var(--color-red-primary)]" />
                            Product Breakdown by URL
                          </h4>
                          <div className="space-y-3">
                            {/* Main Product */}
                            <div className="p-4 rounded-lg bg-[var(--color-black-card-hover)] border-2 border-[var(--color-red-border)]">
                              <div className="flex items-center gap-4">
                                {product.imageUrl && (
                                  <img
                                    src={product.imageUrl.startsWith('http') ? product.imageUrl : `https://${product.imageUrl}`}
                                    alt={product.name}
                                    className="w-16 h-16 rounded-lg object-cover border border-[var(--color-black-border)]"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[var(--color-black-text)] truncate">{product.name}</p>
                                  <p className="text-xs text-[var(--color-black-text-muted)] truncate">{product.url}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-[var(--color-red-primary)]">
                                    {formatPrice(displayPrice, selectedCurrency)}
                                  </p>
                                  <Badge className="mt-1 bg-[var(--color-red-primary)]/20 text-[var(--color-red-primary)] border-[var(--color-red-border)]">
                                    Main Product
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Competitors */}
                            {product.competitors && product.competitors.length > 0 ? (
                              <>
                                <p className="text-xs font-semibold text-[var(--color-black-text-secondary)] uppercase tracking-wider mt-4 mb-2">
                                  Competitors ({product.competitors.length})
                                </p>
                                {product.competitors.map((competitor: any, compIdx: number) => {
                                  const compPrice = convertFromUSD(competitor.price || 0, selectedCurrency);
                                  return (
                                    <motion.div
                                      key={competitor.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: compIdx * 0.05 }}
                                      className="p-4 rounded-lg bg-[var(--color-black-card)] border border-[var(--color-black-border)] hover:border-[var(--color-red-border)] transition-colors"
                                    >
                                      <div className="flex items-center gap-4">
                                        {competitor.imageUrl ? (
                                          <img
                                            src={competitor.imageUrl.startsWith('http') ? competitor.imageUrl : `https://${competitor.imageUrl}`}
                                            alt={competitor.name}
                                            className="w-16 h-16 rounded-lg object-cover border border-[var(--color-black-border)]"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-16 h-16 rounded-lg bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)] flex items-center justify-center">
                                            <Package className="w-8 h-8 text-[var(--color-black-text-muted)]" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-[var(--color-black-text)] truncate">{competitor.name}</p>
                                          <p className="text-xs text-[var(--color-black-text-muted)] truncate mb-1">{competitor.url}</p>
                                          <Badge className="bg-[var(--color-black-card-hover)] text-[var(--color-black-text-muted)] border-[var(--color-black-border)] text-xs">
                                            {competitor.brand}
                                          </Badge>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-base font-bold text-[var(--color-black-text)]">
                                            {formatPrice(compPrice, selectedCurrency)}
                                          </p>
                                          <a
                                            href={competitor.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-[var(--color-red-primary)] hover:text-[var(--color-red-primary)]/80 transition-colors inline-flex items-center gap-1 mt-1"
                                          >
                                            View <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </>
                            ) : (
                              <div className="p-4 rounded-lg bg-[var(--color-black-card)] border border-[var(--color-black-border)] text-center">
                                <p className="text-sm text-[var(--color-black-text-muted)]">No competitors found</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State for Search */}
        {filteredAndSortedProducts.length === 0 && searchQuery && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-[var(--color-black-text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--color-black-text-muted)] text-lg mb-2">No products found</p>
            <p className="text-sm text-[var(--color-black-text-secondary)]">Try adjusting your search query</p>
          </div>
        )}
      </main>
    </div>
  );
}
