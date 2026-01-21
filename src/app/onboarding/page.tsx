'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// @ts-ignore
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Brain, ChevronRight, Loader2, Building2, UserCircle, Users, CheckCircle } from 'lucide-react';

export default function OnboardingPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        role: '',
        employeeCount: '',
    });
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        if (session?.user?.name) {
            setFormData((prev) => ({ ...prev, name: session.user?.name || '' }));
        }

        // If user already completed onboarding with all required fields, redirect to home
        if (session?.user) {
            const hasCompletedProfile =
                // @ts-ignore
                session.user.onboardingCompleted &&
                // @ts-ignore
                session.user.companyName &&
                // @ts-ignore
                session.user.role &&
                // @ts-ignore
                session.user.employeeCount &&
                session.user.name;

            if (hasCompletedProfile) {
                router.push('/dashboard');
            }
        }
    }, [session, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (step === 1) setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                // Update session to reflect completed onboarding
                await update();
                router.push('/dashboard');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Onboarding submission error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const employeeOptions = [
        '1-10',
        '11-50',
        '51-200',
        '201-500',
        '501-1000',
        '1000+',
    ];

    return (
        <div className="min-h-screen bg-[var(--color-black-bg)] flex items-center justify-center p-6 bg-glow-radial">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl"
            >
                <Card className="bg-transparent rounded-3xl overflow-hidden border-2 border-[#404040] p-10 relative">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center"
                            >
                                <div className="flex justify-center mb-8">
                                    <div className="w-24 h-24 rounded-2xl bg-[var(--color-red-opacity)] border-2 border-[var(--color-red-border)] flex items-center justify-center relative shadow-2xl">
                                        <Brain className="w-12 h-12 text-[var(--color-red-primary)]" />
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl bg-[var(--color-red-primary)] opacity-20 blur-xl"
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        />
                                    </div>
                                </div>

                                <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                                    Welcome, <span className="text-[var(--color-red-primary)]">{session?.user?.name?.split(' ')[0] || 'there'}!</span>
                                </h1>
                                <p className="text-[var(--color-black-text-muted)] text-lg mb-10 leading-relaxed max-w-md mx-auto">
                                    To provide you with the most accurate competitive intelligence, we need a few details about your company and role.
                                </p>

                                <Button
                                    onClick={handleNext}
                                    className="w-full h-14 bg-[var(--color-red-primary)] hover:bg-[var(--color-red-primary)]/90 text-white font-bold text-lg rounded-xl transition-all shadow-lg red-glow"
                                >
                                    Let's Get Started
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>

                                <p className="mt-8 text-xs text-[var(--color-black-text-secondary)]">
                                    Step 1 of 2: Confirm Account Information
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-3xl font-bold text-white mb-2 text-center">Complete Your Profile</h2>
                                <p className="text-[var(--color-black-text-muted)] text-center mb-10">Tailoring Monitra to your business needs.</p>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                                            <UserCircle className="w-4 h-4 text-[var(--color-red-primary)]" />
                                            Full Name
                                        </label>
                                        <Input
                                            name="name"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="h-12 bg-transparent border-2 border-[var(--color-black-border)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none rounded-xl transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-[var(--color-red-primary)]" />
                                            Company Name
                                        </label>
                                        <Input
                                            name="companyName"
                                            placeholder="Acme Inc."
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            required
                                            className="h-12 bg-transparent border-2 border-[var(--color-black-border)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none rounded-xl transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[var(--color-red-primary)]" />
                                            Role in Company
                                        </label>
                                        <Input
                                            name="role"
                                            placeholder="Product Manager"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            required
                                            className="h-12 bg-transparent border-2 border-[var(--color-black-border)] focus-visible:border-[var(--color-red-primary)] focus-visible:ring-[var(--color-red-primary)]/20 focus-visible:ring-2 focus-visible:outline-none rounded-xl transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-[var(--color-black-text)] flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[var(--color-red-primary)]" />
                                            Total Employees
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {employeeOptions.map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, employeeCount: opt })}
                                                    className={`h-11 rounded-lg border-2 text-sm font-medium transition-all ${formData.employeeCount === opt
                                                        ? 'border-[var(--color-red-primary)] bg-[var(--color-red-opacity)] text-white'
                                                        : 'border-[var(--color-black-border)] bg-transparent text-[var(--color-black-text-muted)] hover:border-[var(--color-red-border)]'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Terms and Conditions Checkbox */}
                                    <div className="mt-6">
                                        <label className="flex items-start ml-6 gap-3 cursor-pointer group">
                                            <div className="relative flex items-center shrink-0 mt-[2px]">
                                                <input
                                                    type="checkbox"
                                                    checked={termsAccepted}
                                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                                    className="peer  h-5 w-5 cursor-pointer appearance-none rounded border-2 border-[var(--color-black-border)] bg-transparent transition-all checked:border-[var(--color-red-primary)] checked:bg-[var(--color-red-primary)]"
                                                />
                                                <svg
                                                    className="pointer-events-none absolute h-3.5 w-3.5 fill-white opacity-0 transition-opacity peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="text-xs text-[var(--color-black-text-secondary)] leading-[1.6] select-none">
                                                By completing setup, I agree to the <span className="text-[var(--color-red-primary)] hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[var(--color-red-primary)] hover:underline cursor-pointer">Privacy Policy</span>
                                            </p>
                                        </label>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading || !formData.employeeCount || !termsAccepted}
                                        className="w-full h-14 bg-[var(--color-red-primary)] hover:bg-[var(--color-red-primary)]/90 text-white font-bold text-lg rounded-xl transition-all shadow-lg red-glow disabled:opacity-50 mt-4"
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin w-6 h-6" />
                                        ) : (
                                            <>
                                                Complete Setup
                                                <CheckCircle className="w-5 h-5 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-sm text-[var(--color-black-text-muted)] hover:text-[var(--color-red-primary)] transition-colors"
                                    >
                                        Back to Overview
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Decorative gradients */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--color-red-primary)] opacity-10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[var(--color-red-primary)] opacity-10 rounded-full blur-[100px] pointer-events-none" />
                </Card>
            </motion.div>
        </div>
    );
}
