'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { DashboardView } from '@/components/DashboardView';
import { ProductsView } from '@/components/ProductsView';
import { AddProductForm } from '@/components/AddProductForm';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { HeaderWithSidebar } from '@/components/Header';
import { QuotaDisplay } from '@/components/QuotaDisplay';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { DollarSign, LayoutDashboard, Package } from 'lucide-react';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products'>('dashboard');
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
    const [productsData, setProductsData] = useState<any>(null);
    const [productsLoading, setProductsLoading] = useState(false);
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [quotaData, setQuotaData] = useState<{ urlQuota: number; urlUsed: number } | null>(null);
    const [quotaRefreshTrigger, setQuotaRefreshTrigger] = useState(0);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Redirect to onboarding if not completed or missing mandatory fields
    useEffect(() => {
        // @ts-ignore
        if (status === 'authenticated' && session?.user) {
            const isMissingRequiredFields =
                // @ts-ignore
                !session.user.onboardingCompleted ||
                // @ts-ignore
                !session.user.companyName ||
                // @ts-ignore
                !session.user.role ||
                // @ts-ignore
                !session.user.employeeCount ||
                !session.user.name;

            if (isMissingRequiredFields) {
                router.push('/onboarding');
            }
        }
    }, [session, status, router]);

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        setDashboardLoading(true);
        try {
            const response = await fetch('/api/dashboard');
            if (response.ok) {
                const data = await response.json();
                setDashboardData(data);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setDashboardLoading(false);
        }
    };

    // Fetch products data
    const fetchProductsData = async () => {
        setProductsLoading(true);
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            if (response.ok) {
                setProductsData(data.products || data);
            }
        } catch (err) {
            console.error('Failed to fetch products data:', err);
        } finally {
            setProductsLoading(false);
        }
    };

    // Fetch quota data
    const fetchQuotaData = async () => {
        try {
            const response = await fetch('/api/user/quota');
            if (response.ok) {
                const data = await response.json();
                setQuotaData({ urlQuota: data.urlQuota, urlUsed: data.urlUsed });
                // Trigger QuotaDisplay refresh
                setQuotaRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to fetch quota data:', err);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        if (status === 'authenticated') {
            fetchQuotaData();
        }
    }, [status]);

    // Fetch dashboard and products data when tab is switched or auth status changes
    useEffect(() => {
        if (status !== 'authenticated') return;

        if (activeTab === 'dashboard' && !dashboardData) {
            fetchDashboardData();
        }
        if (activeTab === 'products' && !productsData) {
            fetchProductsData();
        }
    }, [activeTab, dashboardData, productsData, status]);

    // Show loading state while checking auth
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    // Don't render anything if redirecting
    if (status === 'unauthenticated') {
        return null;
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="min-h-screen bg-[var(--color-black-bg)] text-[var(--color-black-text)] font-sans flex w-full overflow-x-hidden">
                <AppSidebar
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        setActiveTab(tab);
                        if (tab === 'dashboard' && !dashboardData) {
                            fetchDashboardData();
                        }
                        if (tab === 'products' && !productsData) {
                            fetchProductsData();
                        }
                    }}
                />

                {/* Main Content Area */}
                <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <HeaderWithSidebar />

                    <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingTop: '4rem' }}>
                        <main className="px-6 py-10">
                            {/* Quota Display - Show at top */}
                            <QuotaDisplay 
                                onUpgradeClick={() => setShowSubscriptionModal(true)}
                                refreshTrigger={quotaRefreshTrigger}
                            />

                            {/* Currency Selector - Only show on Dashboard */}
                            {activeTab === 'dashboard' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-end gap-4 mb-6"
                                >
                                    <label className="text-xs text-[#6B7280] uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign className="w-3.5 h-3.5 text-[#9CA3AF]" />
                                        Display Currency
                                    </label>
                                    <select
                                        value={selectedCurrency}
                                        onChange={(e) => setSelectedCurrency(e.target.value)}
                                        className="px-4 py-2 rounded-lg bg-[var(--color-black-card)] border border-[var(--color-black-border)] text-[var(--color-black-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] hover:bg-[var(--color-black-card-hover)] transition-colors"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="INR">INR (₹)</option>
                                        <option value="JPY">JPY (¥)</option>
                                        <option value="CAD">CAD (C$)</option>
                                        <option value="AUD">AUD (A$)</option>
                                    </select>
                                </motion.div>
                            )}

                            {/* Dashboard Tab Content */}
                            {activeTab === 'dashboard' && (
                                <DashboardView
                                    data={dashboardData}
                                    loading={dashboardLoading}
                                    onRefresh={fetchDashboardData}
                                    selectedCurrency={selectedCurrency}
                                />
                            )}

                            {/* Products Tab Content */}
                            {activeTab === 'products' && (
                                <ProductsView
                                    data={productsData}
                                    loading={productsLoading}
                                    onRefresh={fetchProductsData}
                                    selectedCurrency={selectedCurrency}
                                    setSelectedCurrency={setSelectedCurrency}
                                    expandedProducts={expandedProducts}
                                    setExpandedProducts={setExpandedProducts}
                                    onAddProduct={() => setShowAddProduct(true)}
                                    onDelete={() => {
                                        fetchProductsData();
                                        fetchQuotaData();
                                        fetchDashboardData();
                                    }}
                                />
                            )}

                            {/* Add Product Modal Overlay */}
                            <AnimatePresence>
                                {showAddProduct && (
                                    <AddProductForm
                                        onClose={() => setShowAddProduct(false)}
                                    onSuccess={() => {
                                        fetchProductsData();
                                        fetchQuotaData();
                                        fetchDashboardData();
                                        setShowAddProduct(false);
                                    }}
                                        onQuotaExceeded={() => {
                                            setShowSubscriptionModal(true);
                                        }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Subscription Modal */}
                            {quotaData && (
                                <SubscriptionModal
                                    open={showSubscriptionModal}
                                    onOpenChange={setShowSubscriptionModal}
                                    currentQuota={quotaData.urlQuota}
                                    currentUsed={quotaData.urlUsed}
                                />
                            )}
                        </main>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
