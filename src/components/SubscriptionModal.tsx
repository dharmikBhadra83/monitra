"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface SubscriptionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentQuota: number;
    currentUsed: number;
}

export function SubscriptionModal({ open, onOpenChange, currentQuota, currentUsed }: SubscriptionModalProps) {
    const plans = [
        {
            name: 'Pro',
            price: '$29',
            period: '/month',
            quota: 100,
            features: [
                '100 URLs per month',
                'Priority support',
                'Advanced analytics',
                'API access',
            ],
        },
        {
            name: 'Enterprise',
            price: '$99',
            period: '/month',
            quota: 500,
            features: [
                '500 URLs per month',
                'Dedicated support',
                'Custom integrations',
                'SLA guarantee',
            ],
        },
    ];

    const handleSubscribe = (planName: string) => {
        // TODO: Integrate with payment provider (Stripe, etc.)
        console.log(`Subscribe to ${planName}`);
        alert(`Subscription to ${planName} plan - Payment integration needed`);
        // Close modal after subscription
        // onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-[var(--color-black-card)] border-[var(--color-black-border)]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[var(--color-black-text)]">Upgrade Your Plan</DialogTitle>
                    <DialogDescription className="text-[var(--color-black-text-muted)]">
                        You've used {currentUsed} of {currentQuota} URLs. Upgrade to add more URLs to your account.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className="border border-[var(--color-black-border)] rounded-lg p-6 bg-[var(--color-black-bg)] hover:border-[var(--color-red-primary)] transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--color-black-text)]">{plan.name}</h3>
                                    <div className="mt-1">
                                        <span className="text-3xl font-bold text-[var(--color-black-text)]">{plan.price}</span>
                                        <span className="text-[var(--color-black-text-muted)]">{plan.period}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-[var(--color-red-primary)]">
                                        {plan.quota}
                                    </div>
                                    <div className="text-sm text-[var(--color-black-text-muted)]">URLs/month</div>
                                </div>
                            </div>

                            <ul className="space-y-2 mb-4">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-[var(--color-black-text)]">
                                        <Check className="h-4 w-4 text-[var(--color-red-primary)]" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => handleSubscribe(plan.name)}
                                className="w-full bg-[var(--color-red-primary)] hover:opacity-90 text-white"
                            >
                                Subscribe to {plan.name}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--color-black-border)]">
                    <p className="text-sm text-[var(--color-black-text-muted)] text-center">
                        Need a custom plan? <a href="mailto:support@monitra.com" className="text-[var(--color-red-primary)] hover:underline">Contact us</a>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
