'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Trash2, AlertCircle, ExternalLink, Pencil, Plus, DollarSign, X, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { convertFromUSD, formatPrice } from '@/lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { AddCompetitorForm } from '@/components/AddCompetitorForm';

// --- 1. THE PERFECT CENTER CONNECTOR ---
function TreeConnector({ isOpen, competitorCount }: { isOpen: boolean; competitorCount: number }) {
  if (competitorCount === 0) return null;

  // --- MEASUREMENTS ---
  // Each competitor row is 72px height with 1px border between rows
  const rowHeight = 72;
  const borderHeight = 1;
  const totalRowHeight = rowHeight + borderHeight;

  // Calculate center Y position for each competitor row
  const branchYPositions: number[] = [];

  for (let i = 0; i < competitorCount; i++) {
    // Each row center: (rowHeight / 2) + (i * totalRowHeight)
    const yCenter = (rowHeight / 2) + (i * totalRowHeight);
    branchYPositions.push(yCenter);
  }

  // --- PATH DRAWING ---
  // Start from top (where main product row ends) - offset to connect from icon
  const startOffset = 24; // Offset from top to align with icon bottom
  let pathD = `M0,${startOffset} `;

  // Draw trunk to last branch
  const lastBranchY = branchYPositions[branchYPositions.length - 1];
  pathD += `V${lastBranchY} `;

  // Add branches for each competitor - curve to center of each row
  branchYPositions.forEach((y) => {
    // Branch pattern: M0,y Q0,y+20 20,y+20 H52 (matching HTML pattern)
    pathD += `M0,${y} Q0,${y + 20} 20,${y + 20} H52 `;
  });

  const totalHeight = lastBranchY + 50;

  return (
    <svg
      className="absolute pointer-events-none overflow-visible"
      style={{
        top: '-24px', // Start from bottom of icon (matches HTML)
        left: '44px', // Aligned with icon center
        width: '52px',
        height: `${totalHeight}px`,
        zIndex: 5
      }}
      viewBox={`0 0 52 ${totalHeight}`}
    >
      {/* Grey Background Path */}
      <path
        d={pathD}
        fill="none"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Red Animated Liquid Path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#e11d48"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: isOpen ? 1 : 0 }}
        transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

// --- 2. MAIN COMPONENT ---
export function ProductsView({ data, expandedProducts, setExpandedProducts, onDelete, onAddProduct, selectedCurrency, setSelectedCurrency }: any) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCompetitorId, setDeleteCompetitorId] = useState<{ id: string; name: string } | null>(null);
  const [editProduct, setEditProduct] = useState<{ id: string; name: string; brand: string; url: string; imageUrl: string; priceUSD: number } | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; brand: string; url: string; imageUrl: string; priceUSD: string | number }>({ name: '', brand: '', url: '', imageUrl: '', priceUSD: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [addCompetitorMainProductId, setAddCompetitorMainProductId] = useState<string | null>(null);
  const productsArray = Array.isArray(data) ? data : (data?.products || []);

  const toggleProduct = (id: string) => {
    const next = new Set(expandedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedProducts(next);
  };

  // Helper to extract domain from URL
  const getDomainFromUrl = (url: string | null | undefined): string => {
    if (!url) return '-';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      let domain = urlObj.hostname;
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      return domain;
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  // Helper to clean brand name
  const cleanBrand = (brand: string | null | undefined): string => {
    if (!brand) return '-';
    const cleaned = brand.trim();
    if (cleaned.toLowerCase() === 'www' ||
      cleaned.toLowerCase() === 'www.' ||
      cleaned.length < 2 ||
      cleaned.match(/^https?:\/\//)) {
      return '-';
    }
    return cleaned;
  };



  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/products/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the products list by calling onDelete callback
        if (onDelete) {
          onDelete();
        }
      } else {
        const error = await response.json();
        console.error('Delete failed:', error);
        alert('Failed to delete product: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete product');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDeleteCompetitorConfirm = async () => {
    if (!deleteCompetitorId) return;

    try {
      const response = await fetch('/api/products/remove-competitor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: deleteCompetitorId.id }),
      });

      if (response.ok) {
        if (onDelete) {
          onDelete();
        }
        setDeleteCompetitorId(null);
      } else {
        const error = await response.json();
        alert('Failed to remove competitor: ' + (error.error || 'Unknown error'));
        setDeleteCompetitorId(null);
      }
    } catch (error) {
      console.error('Remove competitor error:', error);
      alert('Failed to remove competitor');
      setDeleteCompetitorId(null);
    }
  };

  const handleEditClick = (product: any) => {
    setEditProduct({
      id: product.id,
      name: product.name || '',
      brand: product.brand || '',
      url: product.url || '',
      imageUrl: product.imageUrl || '',
      priceUSD: product.priceUSD || product.latestPrice || 0
    });
    setEditForm({
      name: product.name || '',
      brand: product.brand || '',
      url: product.url || '',
      imageUrl: product.imageUrl || '',
      priceUSD: product.priceUSD || product.latestPrice || 0
    });
  };

  const handleEditSave = async () => {
    if (!editProduct) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/products/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editProduct.id,
          name: editForm.name,
          brand: editForm.brand,
          url: editForm.url,
          imageUrl: editForm.imageUrl,
          priceUSD: editForm.priceUSD
        }),
      });

      if (response.ok) {
        // Refresh the products list
        if (onDelete) {
          onDelete();
        }
        setEditProduct(null);
      } else {
        const error = await response.json();
        alert('Failed to update product: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };


  // Helper to format price in selected currency
  const formatPriceInCurrency = (priceUSD: number) => {
    if (!selectedCurrency || selectedCurrency === 'USD') {
      return `$${priceUSD}`;
    }
    const convertedPrice = convertFromUSD(priceUSD, selectedCurrency);
    return formatPrice(convertedPrice, selectedCurrency);
  };

  return (
    <div className="bg-black p-8 text-white min-h-screen">
      {/* Header with Currency Selector and Add Product Button */}
      <div className="mb-6 flex items-center justify-between">
        {/* Currency Selector */}
        <div className="flex items-center gap-4">
          <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            Display Currency
          </label>
          <select
            value={selectedCurrency || 'USD'}
            onChange={(e) => setSelectedCurrency && setSelectedCurrency(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-[#111] border-2 border-[#1a1a1a] text-white text-sm font-medium cursor-pointer focus:outline-none focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/20 hover:border-[#2a2a2a] hover:bg-[#151515] transition-all shadow-sm min-w-[140px] appearance-none pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem 1rem'
            }}
          >
            <option value="USD" className="bg-[#111] text-white">USD ($)</option>
            <option value="EUR" className="bg-[#111] text-white">EUR (€)</option>
            <option value="GBP" className="bg-[#111] text-white">GBP (£)</option>
            <option value="INR" className="bg-[#111] text-white">INR (₹)</option>
            <option value="JPY" className="bg-[#111] text-white">JPY (¥)</option>
            <option value="CAD" className="bg-[#111] text-white">CAD (C$)</option>
            <option value="AUD" className="bg-[#111] text-white">AUD (A$)</option>
          </select>
        </div>

        {/* Add Product Button */}
        <Button
          onClick={() => onAddProduct && onAddProduct()}
          className="bg-[#e11d48] hover:bg-[#be185d] text-white font-bold px-6 py-2 rounded-lg transition-colors cursor-pointer"
        >
          + Add Product
        </Button>
      </div>

      <div className="rounded-xl border border-[#1a1a1a] bg-[#050505] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#0a0a0a]">
            <TableRow className="border-[#1a1a1a] hover:bg-transparent">
              <TableHead className="w-[100px]"></TableHead>
              <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] w-auto">Name</TableHead>
              <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] w-[120px]">Brand</TableHead>
              <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] w-[160px]">Website</TableHead>
              <TableHead className="text-left text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] w-[140px]">Price</TableHead>
              <TableHead className="text-right text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] w-[100px]">Diff</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsArray.map((product: any) => {
              const isExpanded = expandedProducts.has(product.id);
              const competitors = product.competitors || [];
              const mainProduct = product.mainProduct || product;
              const mainPrice = mainProduct?.priceUSD || mainProduct?.latestPrice || 0;

              // Calculate price difference
              const competitorPrices = competitors.map((c: any) => c.priceUSD || c.latestPrice || 0).filter((p: number) => p > 0);
              const minPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;
              const diff = minPrice > 0 && mainPrice > 0 ? ((mainPrice - minPrice) / minPrice) * 100 : 0;
              const diffText = diff > 0 ? `${diff.toFixed(1)}% ↑` : diff < 0 ? `${Math.abs(diff).toFixed(1)}% ↓` : '-';

              return (
                <React.Fragment key={product.id}>
                  {/* PARENT PRODUCT ROW */}
                  <TableRow
                    className={`cursor-pointer border-[#1a1a1a] transition-colors ${isExpanded ? 'bg-[#0a0a0a]' : 'hover:bg-[#0f0f0f]'}`}
                    onClick={() => toggleProduct(product.id)}
                    style={{ height: '72px' }}
                  >
                    <TableCell className="w-[100px] py-0">
                      <div className="flex items-center gap-4 ml-4">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#e11d48]" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                        <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#222] overflow-hidden shrink-0 relative z-10">
                          <img src={mainProduct?.imageUrl} className="w-full h-full object-contain" alt="" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-zinc-100 py-0">
                      <span
                        title={mainProduct?.name || ''}
                        className="cursor-help line-clamp-2"
                      >
                        {mainProduct?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 w-[120px] py-0">{cleanBrand(mainProduct?.brand) || '-'}</TableCell>
                    <TableCell className="w-[160px] py-0">
                      {mainProduct?.url ? (
                        <a
                          href={mainProduct.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-400 hover:text-[#e11d48] transition-colors flex items-center gap-1 truncate"
                        >
                          {getDomainFromUrl(mainProduct.url)}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-left font-black text-white text-lg w-[140px] py-0">{formatPriceInCurrency(mainPrice)}</TableCell>
                    <TableCell className="text-right font-bold text-[#e11d48] w-[100px] py-0">{diffText}</TableCell>
                    <TableCell className="w-[100px] py-0">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(mainProduct);
                          }}
                          className="text-zinc-700 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddCompetitorMainProductId(mainProduct.id);
                          }}
                          className="text-zinc-700 hover:text-green-500 hover:bg-green-500/10 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row expansion
                            // Use canonicalProductId if available, otherwise use product id
                            setDeleteId(mainProduct.canonicalProductId?.toString() || mainProduct.id);
                          }}
                          className="text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* EXPANDED SECTION */}
                  <AnimatePresence>
                    {isExpanded && (
                      <>
                        {/* Tree Connector Container - positioned absolutely */}
                        <TableRow className="hover:bg-transparent border-none">
                          <TableCell colSpan={7} className="p-0 border-none relative">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="relative overflow-visible"
                              style={{ height: `${competitors.length * 72 + (competitors.length - 1) * 1}px` }}
                            >
                              <TreeConnector isOpen={isExpanded} competitorCount={competitors.length} />
                            </motion.div>
                          </TableCell>
                        </TableRow>

                        {/* Competitor Rows - Using TableRow/TableCell for perfect alignment */}
                        {competitors.map((comp: any, idx: number) => {
                          const compPrice = comp.priceUSD || comp.latestPrice || 0;
                          const compBrand = cleanBrand(comp.brand);

                          return (
                            <TableRow
                              key={idx}
                              className="bg-black border-[#1a1a1a] hover:bg-[#0f0f0f] border-b border-t"
                              style={{ height: '72px' }}
                            >
                              {/* Icon column spacer - matches main row icon column */}
                              <TableCell className="w-[100px]"></TableCell>

                              {/* Name column - matches main row Name */}
                              <TableCell className="font-bold text-zinc-100 py-0">
                                <span
                                  title={comp.name || ''}
                                  className="cursor-help line-clamp-2"
                                >
                                  {comp.name}
                                </span>
                              </TableCell>

                              {/* Brand column - matches main row Brand */}
                              <TableCell className="text-zinc-400 w-[120px] py-0">{compBrand || '-'}</TableCell>

                              {/* Website column - matches main row Website */}
                              <TableCell className="w-[160px] py-0">
                                {comp.url ? (
                                  <a
                                    href={comp.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-[#e11d48] transition-colors flex items-center gap-1 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getDomainFromUrl(comp.url)}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </TableCell>

                              {/* Price column - matches main row Price (text-left) */}
                              <TableCell className="text-left font-black text-white text-lg w-[140px] py-0">{formatPriceInCurrency(compPrice)}</TableCell>

                              {/* Diff column - matches main row Diff (text-right) - empty for competitors */}
                              <TableCell className="text-right w-[100px]"></TableCell>

                              {/* Action buttons column - matches main row */}
                              <TableCell className="w-[100px] py-0">
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick(comp);
                                    }}
                                    className="text-zinc-700 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteCompetitorId({ id: comp.id, name: comp.name || 'this competitor' });
                                    }}
                                    className="text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* --- 3. DELETE DIALOG --- */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white sm:max-w-[425px]">
          <DialogHeader className="flex flex-col items-center pt-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="text-red-500 w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Delete Product?</DialogTitle>
            <DialogDescription className="text-center text-zinc-400 mt-2">
              Are you sure you want to remove this product? All nested competitor data will also be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6 sm:justify-center w-full">
            <Button
              variant="ghost"
              onClick={() => setDeleteId(null)}
              className="flex-1 bg-[#111] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#222]"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- 3b. DELETE COMPETITOR DIALOG --- */}
      <Dialog open={!!deleteCompetitorId} onOpenChange={() => setDeleteCompetitorId(null)}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white sm:max-w-[425px]">
          <DialogHeader className="flex flex-col items-center pt-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="text-red-500 w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Remove Competitor?</DialogTitle>
            <DialogDescription className="text-center text-zinc-400 mt-2">
              Are you sure you want to remove "{deleteCompetitorId?.name}" from the mapping group? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6 sm:justify-center w-full">
            <Button
              variant="ghost"
              onClick={() => setDeleteCompetitorId(null)}
              className="flex-1 bg-[#111] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#222]"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleDeleteCompetitorConfirm}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- 4. EDIT DIALOG --- */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Product</DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2">
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Product Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-transparent border-[var(--color-black-border)] text-[var(--color-black-text)] placeholder:text-[var(--color-black-text-muted)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none"
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Brand</label>
              <Input
                value={editForm.brand}
                onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                className="bg-transparent border-[var(--color-black-border)] text-[var(--color-black-text)] placeholder:text-[var(--color-black-text-muted)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none"
                placeholder="Enter brand name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Website URL</label>
              <Input
                value={editForm.url}
                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                className="bg-transparent border-[var(--color-black-border)] text-[var(--color-black-text)] placeholder:text-[var(--color-black-text-muted)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none"
                placeholder="https://example.com/product"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Image URL</label>
              <Input
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                className="bg-transparent border-[var(--color-black-border)] text-[var(--color-black-text)] placeholder:text-[var(--color-black-text-muted)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <Input
                  type="text"
                  value={editForm.priceUSD}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty or formatted number with max 3 decimals
                    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
                      setEditForm({ ...editForm, priceUSD: val });
                    }
                  }}
                  className="pl-7 bg-transparent border-[var(--color-black-border)] text-[var(--color-black-text)] placeholder:text-[var(--color-black-text-muted)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.000"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setEditProduct(null)}
              className="flex-1 bg-[#111] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#222]"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#e11d48] hover:bg-[#be185d] text-white font-bold"
              onClick={handleEditSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- 5. ADD COMPETITOR FORM --- */}
      {addCompetitorMainProductId && (() => {
        // Find the product group that contains this product
        const productGroup = productsArray.find((group: any) => {
          const mainProduct = group.mainProduct || group;
          return mainProduct.id === addCompetitorMainProductId;
        });

        if (!productGroup) {
          return null;
        }

        const mainProduct = productGroup.mainProduct || productGroup;

        if (!mainProduct.canonicalProductId) {
          return null;
        }

        return (
          <AddCompetitorForm
            canonicalProductId={mainProduct.canonicalProductId}
            onClose={() => {
              setAddCompetitorMainProductId(null);
            }}
            onSuccess={() => {
              if (onDelete) {
                onDelete();
              }
              setAddCompetitorMainProductId(null);
            }}
          />
        );
      })()}
    </div>
  );
}