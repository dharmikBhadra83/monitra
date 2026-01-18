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
import { ChevronDown, ChevronRight, Trash2, AlertCircle, ExternalLink, Pencil, Plus, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { convertFromUSD, formatPrice } from '@/lib/currency';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [editProduct, setEditProduct] = useState<{ id: string; name: string; brand: string; url: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', brand: '', url: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [addCompetitorMainProductId, setAddCompetitorMainProductId] = useState<string | null>(null);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
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

  // Helper to truncate product title
  const truncateTitle = (title: string | null | undefined, maxLength: number = 60): string => {
    if (!title) return '-';
    const cleaned = title.trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
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

  const handleEditClick = (product: any) => {
    setEditProduct({
      id: product.id,
      name: product.name || '',
      brand: product.brand || '',
      url: product.url || '',
    });
    setEditForm({
      name: product.name || '',
      brand: product.brand || '',
      url: product.url || '',
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

  const handleAddCompetitor = async () => {
    if (!addCompetitorMainProductId || !competitorUrl.trim()) return;

    setIsAddingCompetitor(true);
    try {
      const response = await fetch('/api/products/add-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainProductId: addCompetitorMainProductId,
          competitorUrl: competitorUrl.trim(),
        }),
      });

      if (response.ok) {
        // Refresh the products list
        if (onDelete) {
          onDelete();
        }
        setAddCompetitorMainProductId(null);
        setCompetitorUrl('');
      } else {
        const error = await response.json();
        alert('Failed to add competitor: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Add competitor error:', error);
      alert('Failed to add competitor');
    } finally {
      setIsAddingCompetitor(false);
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
            className="px-4 py-2 rounded-lg bg-[#111] border border-[#1a1a1a] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#e11d48] hover:bg-[#0f0f0f] transition-colors"
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

        {/* Add Product Button */}
        <Button
          onClick={() => onAddProduct && onAddProduct()}
          className="bg-[#e11d48] hover:bg-[#be185d] text-white font-bold px-6 py-2 rounded-lg transition-colors"
        >
          + Add Product
        </Button>
      </div>

      <div className="rounded-xl border border-[#1a1a1a] bg-[#050505] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#0a0a0a]">
            <TableRow className="border-[#1a1a1a] hover:bg-transparent">
              <TableHead className="w-[100px]"></TableHead>
              <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Name</TableHead>
              <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Brand</TableHead>
              <TableHead className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Website</TableHead>
              <TableHead className="text-right text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Price</TableHead>
              <TableHead className="text-right text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Diff</TableHead>
              <TableHead className="w-[80px]"></TableHead>
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
                  >
                    <TableCell className="py-5">
                      <div className="flex items-center gap-4 ml-4">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#e11d48]" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                        <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#222] overflow-hidden flex-shrink-0 relative z-10">
                           <img src={mainProduct?.imageUrl} className="w-full h-full object-contain" alt="" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-zinc-100">
                      <span 
                        title={mainProduct?.name || ''}
                        className="cursor-help"
                      >
                        {truncateTitle(mainProduct?.name)}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400">{cleanBrand(mainProduct?.brand) || '-'}</TableCell>
                    <TableCell>
                      {mainProduct?.url ? (
                        <a
                          href={mainProduct.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-400 hover:text-[#e11d48] transition-colors flex items-center gap-1"
                        >
                          {getDomainFromUrl(mainProduct.url)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-white text-lg">{formatPriceInCurrency(mainPrice)}</TableCell>
                    <TableCell className="text-right font-bold text-[#e11d48]">{diffText}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { 
                            e.stopPropagation();
                            handleEditClick(mainProduct);
                          }}
                          className="text-zinc-700 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { 
                            e.stopPropagation();
                            setAddCompetitorMainProductId(product.id);
                          }}
                          className="text-zinc-700 hover:text-green-500 hover:bg-green-500/10 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { 
                            e.stopPropagation(); // Prevent row expansion
                            // Use canonicalProductId if available, otherwise use product id
                            setDeleteId(product.canonicalProductId?.toString() || product.id); 
                          }}
                          className="text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors"
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
                              <TableCell className="font-bold text-zinc-100">
                                <span 
                                  title={comp.name || ''}
                                  className="cursor-help"
                                >
                                  {truncateTitle(comp.name)}
                                </span>
                              </TableCell>
                              
                              {/* Brand column - matches main row Brand */}
                              <TableCell className="text-zinc-400">{compBrand || '-'}</TableCell>
                              
                              {/* Website column - matches main row Website */}
                              <TableCell>
                                {comp.url ? (
                                  <a
                                    href={comp.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-[#e11d48] transition-colors flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getDomainFromUrl(comp.url)}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </TableCell>
                              
                              {/* Price column - matches main row Price (text-right) */}
                              <TableCell className="text-right font-black text-white text-lg">{formatPriceInCurrency(compPrice)}</TableCell>
                              
                              {/* Diff column - matches main row Diff (text-right) - empty for competitors */}
                              <TableCell className="text-right"></TableCell>
                              
                              {/* Action buttons column - matches main row */}
                              <TableCell>
                                <div className="flex items-center gap-2 justify-end">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      handleEditClick(comp);
                                    }}
                                    className="text-zinc-700 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
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

      {/* --- 4. EDIT DIALOG --- */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Product</DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2">
              Update the product name, brand, and website URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Product Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-[#111] border-[#1a1a1a] text-white placeholder:text-zinc-500"
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Brand</label>
              <Input
                value={editForm.brand}
                onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                className="bg-[#111] border-[#1a1a1a] text-white placeholder:text-zinc-500"
                placeholder="Enter brand name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Website URL</label>
              <Input
                value={editForm.url}
                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                className="bg-[#111] border-[#1a1a1a] text-white placeholder:text-zinc-500"
                placeholder="https://example.com/product"
              />
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

      {/* --- 5. ADD COMPETITOR DIALOG --- */}
      <Dialog open={!!addCompetitorMainProductId} onOpenChange={() => {
        setAddCompetitorMainProductId(null);
        setCompetitorUrl('');
      }}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Competitor</DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2">
              Enter the URL of a competitor product to add to this mapping.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Competitor Product URL</label>
              <Input
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                className="bg-[#111] border-[#1a1a1a] text-white placeholder:text-zinc-500"
                placeholder="https://example.com/competitor-product"
                type="url"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => {
                setAddCompetitorMainProductId(null);
                setCompetitorUrl('');
              }}
              className="flex-1 bg-[#111] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#222]"
              disabled={isAddingCompetitor}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-[#e11d48] hover:bg-[#be185d] text-white font-bold" 
              onClick={handleAddCompetitor}
              disabled={isAddingCompetitor || !competitorUrl.trim()}
            >
              {isAddingCompetitor ? 'Adding...' : 'Add Competitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}