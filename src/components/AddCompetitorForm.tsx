'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';
import { Plus, X, Layers, Zap } from 'lucide-react';

interface AddCompetitorFormProps {
  onClose: () => void;
  onSuccess: () => void;
  canonicalProductId: number;
}

export function AddCompetitorForm({
  onClose,
  onSuccess,
  canonicalProductId
}: AddCompetitorFormProps) {
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const filteredUrls = competitorUrls.filter(u => u.trim() !== '');
    if (filteredUrls.length === 0) {
      setError('Please add at least one competitor URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/products/add-to-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          canonicalProductId,
          urls: filteredUrls 
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add competitor products');
      }

      if (data.addedCount === 0) {
        setError("No products could be added. Please check the URLs and try again.");
        setLoading(false);
        return;
      }

      // Show toast with success message
      const count = data.addedCount;
      const productText = count === 1 ? 'competitor product' : 'competitor products';
      setToastMessage(`Added ${count} ${productText} to mapping`);
      setShowToast(true);

      // Close form and refresh after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-[var(--color-black-bg)] border-2 border-[var(--color-black-border)] shadow-2xl overflow-hidden rounded-3xl relative p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-[var(--color-black-text)] flex items-center gap-2">
              <Zap className="w-6 h-6 text-[var(--color-red-primary)]" />
              Add Competitor
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-black-card-hover)] text-[var(--color-black-text-muted)] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--color-red-primary)]" />
                  Competitor URLs
                  <span className="text-xs text-[var(--color-black-text-muted)] font-normal">
                    ({competitorUrls.filter(u => u.trim() !== '').length} added)
                  </span>
                </label>
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    type="button"
                    onClick={() => setCompetitorUrls([...competitorUrls, ''])}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-[var(--color-red-primary)] text-[var(--color-red-primary)] hover:bg-[var(--color-red-opacity)] shadow-sm"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add URL
                  </Button>
                </motion.div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {competitorUrls.map((url, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className="flex gap-2 mb-2"
                    >
                      <Input
                        type="url"
                        placeholder={`Competitor URL ${idx + 1}`}
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...competitorUrls];
                          newUrls[idx] = e.target.value;
                          setCompetitorUrls(newUrls);
                        }}
                        className="h-10 bg-transparent border-[var(--color-black-border)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none rounded-lg text-sm"
                      />
                      {competitorUrls.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => setCompetitorUrls(competitorUrls.filter((_, i) => i !== idx))}
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-gray-500 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <div className="pt-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  variant="ghost"
                  className="flex-1 h-12 bg-[var(--color-black-card)] text-[var(--color-black-text)] hover:bg-[var(--color-black-card-hover)] border border-[var(--color-black-border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || competitorUrls.filter(u => u.trim() !== '').length === 0}
                  className="flex-1 h-12 bg-[var(--color-red-primary)] hover:bg-[var(--color-red-primary)]/90 text-white font-bold rounded-xl shadow-lg red-glow relative overflow-hidden transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      Adding... <Zap className="w-4 h-4 fill-current" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Add Competitor{competitorUrls.filter(u => u.trim() !== '').length !== 1 ? 's' : ''} <Zap className="w-4 h-4 fill-current" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </motion.div>
  );
}
