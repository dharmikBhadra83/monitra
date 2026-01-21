"use client";

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface QuotaData {
    urlQuota: number;
    urlUsed: number;
    remaining: number;
    isQuotaExceeded: boolean;
}

interface QuotaDisplayProps {
    onUpgradeClick?: () => void;
    refreshTrigger?: number; // When this changes, refresh the quota
}

export function QuotaDisplay({ onUpgradeClick, refreshTrigger = 0 }: QuotaDisplayProps) {
    const [quota, setQuota] = useState<QuotaData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuota();
    }, [refreshTrigger]);

    const fetchQuota = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/user/quota');
            if (response.ok) {
                const data = await response.json();
                setQuota(data);
            }
        } catch (error) {
            console.error('Failed to fetch quota:', error);
        } finally {
            setLoading(false);
        }
    };

    // Show previous quota data while loading (for smooth updates)
    if (!quota) {
        return null;
    }

    const percentage = (quota.urlUsed / quota.urlQuota) * 100;
    const isWarning = percentage >= 80;
    const isExceeded = quota.isQuotaExceeded;

    return (
        <div className={`mb-6 p-4 rounded-lg border ${
            isExceeded 
                ? 'bg-[var(--color-black-card)] border-[var(--color-red-primary)]/50' 
                : isWarning 
                    ? 'bg-[var(--color-black-card)] border-[var(--color-red-border)]'
                    : 'bg-[var(--color-black-card)] border-[var(--color-black-border)]'
        }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isExceeded ? (
                        <AlertCircle className="h-5 w-5 text-[var(--color-red-primary)]" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5 text-[var(--color-red-primary)]" />
                    )}
                    <div>
                        <div className="text-sm font-medium text-[var(--color-black-text)]">
                            URL Quota: {quota.urlUsed} / {quota.urlQuota} used
                        </div>
                        <div className="text-xs text-[var(--color-black-text-muted)] mt-1">
                            {quota.remaining} URLs remaining
                        </div>
                    </div>
                </div>
                {isExceeded && onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        className="px-4 py-2 bg-[var(--color-red-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Upgrade Plan
                    </button>
                )}
            </div>
            <div className="mt-3">
                <div className="w-full bg-[var(--color-black-border)] rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${
                            isExceeded
                                ? 'bg-[var(--color-red-primary)]'
                                : isWarning
                                    ? 'bg-[var(--color-red-primary)]/70'
                                    : 'bg-[var(--color-red-primary)]/50'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
