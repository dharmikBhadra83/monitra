'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Target, Layers, RefreshCw, Zap } from 'lucide-react';

interface AddProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductForm({
  onClose,
  onSuccess
}: AddProductFormProps) {
  const [mainUrl, setMainUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainUrl) return;

    setLoading(true);
    setAnalysisStep('Initializing analysis...');
    setError(null);

    const steps = [
      'Fetching live market data...',
      'Synthesizing Product DNA...',
      'Discovering market alternatives...',
      'Validating price positioning...',
      'Generating intelligence report...'
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        setAnalysisStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 2000);

    try {
      const filteredCompetitors = competitorUrls.filter(u => u.trim() !== '');
      
      const res = await fetch('/api/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainUrl, competitorUrls: filteredCompetitors }),
      });

      clearInterval(interval);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add product');
      }

      if (data.mappingCount === 0) {
        setError("Product found, but no competitors could be mapped. Please provide valid competitor URLs.");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setAnalysisStep('');
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
              Add New Product Mapping
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-black-card-hover)] text-[var(--color-black-text-muted)] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 relative group">
              <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--color-red-primary)]" />
                Your Main Product URL
              </label>
              <Input
                required
                type="url"
                placeholder="https://amazon.com/your-product"
                value={mainUrl}
                onChange={(e) => setMainUrl(e.target.value)}
                className="h-12 bg-transparent border-2 border-[var(--color-black-border)] focus-visible:border-[var(--color-red-primary)] rounded-xl transition-all group-hover:border-[var(--color-red-border)]"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--color-red-primary)]" />
                  Competitor URLs
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

              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
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
                        className="h-10 bg-transparent border-[var(--color-black-border)] focus-visible:border-[var(--color-red-primary)] rounded-lg text-sm"
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
              <Button
                type="submit"
                disabled={loading || !mainUrl}
                className="w-full h-12 bg-[var(--color-red-primary)] hover:bg-[var(--color-red-primary)]/90 text-white font-bold rounded-xl shadow-lg red-glow relative overflow-hidden transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center space-y-3 w-full">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <RefreshCw className="w-5 h-5 text-white" />
                      </motion.div>
                      <motion.span
                        key={analysisStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-medium"
                      >
                        {analysisStep}
                      </motion.span>
                    </div>
                    <div className="w-full max-w-xs h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-1/3 h-full bg-white/80 rounded-full"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    Start Analysis <Zap className="w-4 h-4 fill-current" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
