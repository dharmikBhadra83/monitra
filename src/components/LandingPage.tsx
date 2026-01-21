'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, TrendingDown, Target, Zap, Shield, BarChart3, Check, Star, DollarSign } from 'lucide-react';
import { useEffect } from 'react';

export function LandingPage() {
    const router = useRouter();
    const { data: session } = useSession();

    useEffect(() => {
        // Initialize scroll animations
        if (typeof window !== 'undefined') {
            const scrollScript = document.createElement('script');
            scrollScript.innerHTML = `
        (function () {
          const once = true;
          if (!window.__inViewIO) {
            window.__inViewIO = new IntersectionObserver((entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("animate");
                  if (once) window.__inViewIO.unobserve(entry.target);
                }
              });
            }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
          }
          window.initInViewAnimations = function (selector = ".animate-on-scroll") {
            document.querySelectorAll(selector).forEach((el) => {
              window.__inViewIO.observe(el);
            });
          };
          initInViewAnimations();
        })();
      `;
            document.body.appendChild(scrollScript);

            // Initialize UnicornStudio for animated background
            const unicornScript = document.createElement('script');
            unicornScript.innerHTML = `
        !function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head || document.body).appendChild(i)}}();
      `;
            document.body.appendChild(unicornScript);

            return () => {
                document.body.removeChild(scrollScript);
                document.body.removeChild(unicornScript);
            };
        }
    }, []);

    const handleGetStarted = () => {
        if (session) {
            router.push('/dashboard');
        } else {
            router.push('/login');
        }
    };

    return (
        <div className="antialiased overflow-x-hidden selection:bg-green-600/30 selection:text-green-200 text-white bg-black">
            {/* Progressive Blur Top */}
            <div className="gradient-blur">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>

            {/* Navigation */}
            <div className="fixed flex z-50 w-full pt-6 pr-4 pl-4 top-0 left-0 justify-center">
                <nav className="shadow-black/50 flex md:gap-12 md:w-auto bg-black/60 w-full max-w-5xl rounded-none pt-2 pr-2 pb-2 pl-6 shadow-2xl backdrop-blur-lg gap-x-8 gap-y-8 items-center justify-between" style={{ position: 'relative', '--border-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.2))', '--border-radius-before': '0' } as any}>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-medium tracking-tight text-white font-sans">
                            Monitra
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-xs font-medium text-gray-400 hover:text-white transition-colors font-sans">
                            Features
                        </a>
                        <a href="#pricing" className="text-xs font-medium text-gray-400 hover:text-white transition-colors font-sans">
                            Pricing
                        </a>
                        {/* <a href="#testimonials" className="text-xs font-medium text-gray-400 hover:text-white transition-colors font-sans">
                            Reviews
                        </a> */}
                    </div>
                    <div className="flex gap-4 shrink-0 gap-x-4 gap-y-4 items-center">
                        <button
                            onClick={handleGetStarted}
                            className="group inline-flex overflow-hidden transition-transform active:scale-95 cursor-pointer outline-none rounded-none pt-2.5 pr-6 pb-2.5 pl-6 relative gap-x-4 gap-y-4 items-center justify-center"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        >
                            <span className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#22c55e_100%)] opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite]"></span>
                            <span className="absolute inset-0 rounded-none bg-zinc-800 transition-opacity duration-700 group-hover:opacity-0"></span>
                            <span className="z-10 bg-black rounded-none absolute top-[1px] right-[1px] bottom-[1px] left-[1px]"></span>
                            <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-0 group-hover:opacity-100 z-10" style={{ background: 'radial-gradient(50% 50% at 50% 100%, rgba(34, 197, 94, 0.2) 0%, transparent 100%)' }}></div>
                            <span className="relative z-20 flex items-center justify-center gap-2 text-xs font-medium text-white tracking-wide uppercase">
                                <span>{session ? 'Dashboard' : 'Get Started'}</span>
                                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </span>
                        </button>
                    </div>
                </nav>
            </div>

            {/* Hero Section */}
            <section className="min-h-screen flex flex-col md:pt-20 overflow-hidden w-full pt-32 relative items-center justify-center" style={{ maskImage: 'linear-gradient(180deg, transparent, black 0%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, transparent, black 0%, black 95%, transparent)' }}>
                {/* Animated Background */}
                <div className="aura-background-component -z-10 w-full top-0 absolute h-[800px]" data-alpha-mask="80" style={{ maskImage: 'linear-gradient(transparent, black 0%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, black 0%, black 80%, transparent)' }}>
                    <div className="aura-background-component top-0 w-full -z-10 absolute h-full">
                        <div data-us-project="sajpUiTp7MIKdX6daDCu" className="absolute w-full h-full left-0 top-0 -z-10" style={{ filter: 'hue-rotate(120deg) saturate(1.2)' }}></div>
                    </div>
                </div>

                <div className="z-10 text-center max-w-5xl mt-24 mr-auto mb-24 ml-auto pr-6 pl-6 relative">
                    {/* Badge */}
                    <div className="[animation:fadeSlideIn_1s_ease-out_0.8s_both] animate-on-scroll inline-flex transition-transform hover:scale-105 cursor-pointer group animate bg-gradient-to-br from-white/10 to-white/0 rounded-full mb-10 pt-1.5 pr-3 pb-1.5 pl-3 backdrop-blur-sm gap-x-2 gap-y-2 items-center" style={{ position: 'relative', '--border-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.1))', '--border-radius-before': '9999px' } as any}>
                        <span className="flex h-1.5 w-1.5 rounded-full group-hover:animate-pulse bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                        <span className="text-xs font-medium tracking-wide group-hover:text-white transition-colors font-sans text-green-100/80">
                            AI-Powered Price Intelligence
                        </span>
                    </div>

                    {/* Heading */}
                    <h1 className="[animation:fadeSlideIn_1s_ease-out_1s_both] animate-on-scroll animate flex flex-wrap justify-center gap-x-[0.25em] gap-y-2 leading-[1.1] md:text-8xl cursor-default text-6xl font-medium tracking-tighter font-sans mb-8">
                        <span className="inline-flex bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 opacity-60">
                            Stay
                        </span>
                        <span className="inline-flex bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 opacity-100">
                            competitive
                        </span>
                        <span className="inline-flex bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 opacity-60">
                            with
                        </span>
                        <span className="inline-flex bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 opacity-60">
                            real-time
                        </span>
                        <span className="inline-flex bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 opacity-100">
                            pricing
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="[animation:fadeSlideIn_1s_ease-out_1.2s_both] animate-on-scroll leading-relaxed md:text-2xl text-xl text-gray-400 tracking-normal max-w-3xl mr-auto mb-12 ml-auto animate font-sans font-medium">
                        Track competitor prices automatically, get instant alerts, and make data-driven pricing decisions with AI-powered market intelligence.
                    </p>

                    {/* CTA Buttons */}
                    <div className="[animation:fadeSlideIn_1s_ease-out_1.4s_both] animate-on-scroll flex flex-col md:flex-row gap-6 animate mb-12 gap-x-6 gap-y-6 items-center justify-center">
                        <button
                            onClick={handleGetStarted}
                            className="group flex min-w-[180px] decoration-0 transition-transform active:scale-95 cursor-pointer outline-none w-auto h-[50px] pr-6 pl-6 relative items-center justify-center"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', opacity: 1, border: 'none' }}
                        >
                            <div className="pointer-events-none transition-opacity ease-in-out duration-[1200ms] group-hover:opacity-0 opacity-100 absolute top-0 right-0 bottom-0 left-0" style={{ background: 'radial-gradient(15% 50% at 50% 100%, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0) 100%)', borderRadius: '8px', filter: 'blur(15px)' }}></div>
                            <div className="pointer-events-none transition-opacity ease-in-out duration-[1200ms] group-hover:opacity-100 opacity-0 absolute top-0 right-0 bottom-0 left-0" style={{ background: 'radial-gradient(60.6% 50% at 50% 100%, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0) 100%)', borderRadius: '8px', filter: 'blur(18px)' }}></div>
                            <div className="pointer-events-none will-change-auto transition-opacity ease-in-out duration-[1200ms] group-hover:opacity-0 opacity-100 absolute top-0 right-0 bottom-0 left-0" style={{ background: 'radial-gradient(10.7% 50% at 50% 100%, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0) 100%)', borderRadius: '8px' }}></div>
                            <div className="pointer-events-none will-change-auto transition-opacity ease-in-out duration-[1200ms] group-hover:opacity-100 opacity-0 absolute top-0 right-0 bottom-0 left-0" style={{ background: 'radial-gradient(60.1% 50% at 50% 100%, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0) 100%)', borderRadius: '8px' }}></div>
                            <div className="rounded-[7px] absolute top-[1px] right-[1px] bottom-[1px] left-[1px]" style={{ backgroundColor: 'rgb(0, 0, 0)', opacity: 1 }}></div>
                            <div className="relative z-20 flex items-center justify-center gap-2 opacity-100">
                                <span className="m-0 p-0 font-sans text-[15px] font-medium text-white tracking-wide" style={{ WebkitFontSmoothing: 'antialiased', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                    Start Free Trial
                                </span>
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </div>
                        </button>


                    </div>

                    {/* Trust Badge */}
                    <div className="[animation:fadeSlideIn_1s_ease-out_1.6s_both] animate-on-scroll flex flex-col animate mt-32 mb-20 gap-x-4 gap-y-4 items-center">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest font-sans">
                            Trusted by e-commerce businesses worldwide
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="w-full max-w-7xl z-20 mt-24 mr-auto mb-24 ml-auto pt-10 pr-2 pb-32 pl-2 relative">
                <div className="mb-16 text-center [animation:fadeSlideIn_1s_ease-out_0.2s_both] animate-on-scroll">
                    <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight font-sans mb-4">
                        Powerful Features
                    </h2>
                    <p className="text-lg text-gray-400 font-sans max-w-2xl mx-auto">
                        Everything you need to stay ahead of your competition
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 gap-x-6 gap-y-6">
                    {/* Feature 1 */}
                    <div className="lg:col-span-2 group overflow-hidden hover:border-white/20 transition-all duration-300 border-dashed bg-black border-zinc-800 border rounded-none pt-8 pr-8 pb-8 pl-8 relative backdrop-blur-sm [animation:fadeSlideIn_1s_ease-out_0.3s_both] animate-on-scroll">
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="mb-8">
                                <TrendingDown className="w-8 h-8 text-green-600 mb-4" />
                                <h3 className="text-2xl font-semibold text-white font-sans mb-2 tracking-tight">
                                    Real-Time Tracking
                                </h3>
                                <p className="text-sm text-gray-400 font-sans leading-relaxed">
                                    Monitor competitor prices 24/7 with automatic updates and instant notifications.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="lg:col-span-2 group overflow-hidden hover:border-white/20 transition-all duration-300 bg-zinc-900/40 border-white/10 border rounded-none pt-8 pr-8 pb-8 pl-8 relative backdrop-blur-sm [animation:fadeSlideIn_1s_ease-out_0.4s_both] animate-on-scroll">
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="mb-8">
                                <Target className="w-8 h-8 text-green-600 mb-4" />
                                <h3 className="text-2xl font-semibold text-white font-sans mb-2 tracking-tight">
                                    Smart Alerts
                                </h3>
                                <p className="text-sm text-gray-400 font-sans leading-relaxed">
                                    Get notified when competitors change prices or when opportunities arise.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="lg:col-span-2 group overflow-hidden hover:border-white/20 transition-all duration-300 bg-zinc-900/40 border-white/10 border rounded-none pt-8 pr-8 pb-8 pl-8 relative backdrop-blur-sm [animation:fadeSlideIn_1s_ease-out_0.5s_both] animate-on-scroll">
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="mb-8">
                                <Zap className="w-8 h-8 text-green-600 mb-4" />
                                <h3 className="text-2xl font-semibold text-white font-sans mb-2 tracking-tight">
                                    AI Insights
                                </h3>
                                <p className="text-sm text-gray-400 font-sans leading-relaxed">
                                    Leverage AI to identify pricing trends and optimization opportunities.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature 4 */}
                    <div className="lg:col-span-3 group overflow-hidden hover:border-white/20 transition-all duration-300 border-dashed bg-black border-zinc-800 border rounded-none pt-8 pr-8 pb-8 pl-8 relative backdrop-blur-sm [animation:fadeSlideIn_1s_ease-out_0.6s_both] animate-on-scroll">
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="mb-8 max-w-sm">
                                <Shield className="w-8 h-8 text-green-600 mb-4" />
                                <h3 className="text-2xl font-semibold text-white font-sans mb-2 tracking-tight">
                                    Secure & Reliable
                                </h3>
                                <p className="text-sm text-gray-400 font-sans leading-relaxed">
                                    Enterprise-grade security with 99.9% uptime guarantee.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature 5 */}
                    <div className="lg:col-span-3 group overflow-hidden hover:border-white/20 transition-all duration-300 bg-zinc-900/40 border-white/10 border rounded-none pt-8 pr-8 pb-8 pl-8 relative backdrop-blur-sm [animation:fadeSlideIn_1s_ease-out_0.7s_both] animate-on-scroll">
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="mb-8 max-w-sm">
                                <BarChart3 className="w-8 h-8 text-green-600 mb-4" />
                                <h3 className="text-2xl font-semibold text-white font-sans mb-2 tracking-tight">
                                    Analytics Dashboard
                                </h3>
                                <p className="text-sm text-gray-400 font-sans leading-relaxed">
                                    Visualize market trends with comprehensive charts and reports.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section - Commented out for now */}

            {/* Pricing Section */}
            <section id="pricing" className="w-full max-w-7xl z-20 mt-0 mr-auto mb-32 ml-auto pt-6 pr-6 pb-6 pl-6 relative">
                <div className="flex flex-col text-center mb-20 items-center [animation:fadeSlideIn_1s_ease-out_0.2s_both] animate-on-scroll">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-600/20 bg-green-600/5 mb-6">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-200 uppercase tracking-widest font-sans">
                            Pricing
                        </span>
                    </div>
                    <h2 className="md:text-7xl text-5xl font-medium text-white tracking-tighter font-sans mb-6">
                        Simple, transparent
                        <span className="bg-clip-text text-transparent bg-[#22c55e]"> pricing</span>
                    </h2>
                    <p className="text-xl text-gray-400 font-sans max-w-2xl leading-relaxed">
                        Choose the perfect plan for your business needs. Start free, upgrade anytime.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 mb-12 pt-4 pr-4 pb-4 pl-4 gap-x-6 gap-y-6">
                    {/* Starter Plan */}
                    <div className="flex flex-col h-full bg-black border p-8 md:p-10 hover:border-zinc-700 transition-colors duration-300 border-dashed border-zinc-800 [animation:fadeSlideIn_1s_ease-out_0.4s_both] animate-on-scroll">
                        <div className="mb-auto">
                            <h3 className="text-4xl font-medium text-white tracking-tighter font-sans mb-4">
                                Starter
                            </h3>
                            <p className="text-zinc-400 text-base font-sans leading-relaxed mb-8">
                                Perfect for small businesses getting started with price tracking.
                            </p>

                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-[1.5rem] align-top text-zinc-400 font-medium translate-y-2">$</span>
                                <span className="text-6xl font-medium text-white tracking-tighter font-sans">0</span>
                                <span className="text-zinc-500 text-lg font-normal font-sans">/ mo</span>
                            </div>
                            <p className="text-zinc-500 text-sm font-sans mb-10">
                                50 URLs
                            </p>

                            <button
                                onClick={handleGetStarted}
                                className="group flex items-center justify-center gap-2 px-6 py-3 border border-zinc-700 text-white text-sm font-medium font-sans hover:bg-zinc-800 transition-all w-full"
                            >
                                Get Started
                            </button>
                        </div>

                        <div className="border-t border-zinc-800/80 my-10 w-full"></div>

                        <div>
                            <h4 className="text-sm font-medium text-white font-sans mb-6 uppercase tracking-wider">
                                What's included
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        50 URLs
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Daily price updates
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Free trial
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Basic analytics
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Professional Plan (Popular) */}
                    <div className="flex flex-col h-full bg-zinc-900/30 border p-8 md:p-10 relative overflow-hidden transition-colors duration-300 border-dashed border-zinc-800 hover:border-zinc-700 [animation:fadeSlideIn_1s_ease-out_0.5s_both] animate-on-scroll">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#22c55e]/10 blur-[90px] rounded-full pointer-events-none"></div>

                        <div className="mb-auto relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-4xl font-medium text-white tracking-tighter font-sans">
                                    Professional
                                </h3>
                                <span className="text-[10px] uppercase font-semibold text-white tracking-wider bg-[#22c55e] rounded-sm px-2 py-1 shadow-[0_0_10px_rgba(34,197,94,0.35)]">
                                    Most Popular
                                </span>
                            </div>

                            <p className="text-zinc-400 text-base font-sans leading-relaxed mb-8">
                                For growing businesses that need advanced features.
                            </p>

                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-[1.5rem] text-zinc-400 font-medium translate-y-2">$</span>
                                <span className="text-6xl font-medium text-white tracking-tighter font-sans">14</span>
                                <span className="text-zinc-500 text-lg font-sans">/ mo</span>
                            </div>

                            <p className="text-zinc-500 text-sm font-sans mb-10">
                                500 URLs
                            </p>

                            <button
                                onClick={handleGetStarted}
                                className="flex cursor-pointer items-center justify-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold font-sans hover:bg-zinc-200 transition-all w-full"
                            >
                                Coming Soon
                            </button>
                        </div>

                        <div className="border-t border-zinc-800/80 my-10 w-full relative z-10"></div>

                        <div className="relative z-10">
                            <h4 className="text-sm font-medium text-white font-sans mb-6 uppercase tracking-wider">
                                Everything in Starter, plus:
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300">
                                        500 URLs
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300">
                                        Daily price updates
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300">
                                        AI-powered insights
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300">
                                        Advanced analytics
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300">
                                        Email alerts
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="flex flex-col h-full bg-black border p-8 md:p-10 hover:border-zinc-700 transition-colors duration-300 border-dashed border-zinc-800 [animation:fadeSlideIn_1s_ease-out_0.6s_both] animate-on-scroll">
                        <div className="mb-auto">
                            <h3 className="text-4xl font-medium text-white tracking-tighter font-sans mb-4">
                                Enterprise
                            </h3>
                            <p className="text-zinc-400 text-base font-sans leading-relaxed mb-8">
                                Custom solutions for large organizations.
                            </p>

                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-medium text-white tracking-tighter font-sans">
                                    Custom
                                </span>
                            </div>

                            <button
                                onClick={handleGetStarted}
                                className="group flex items-center justify-center gap-2 px-6 py-3 border border-zinc-700 text-white text-sm font-medium font-sans hover:bg-zinc-800 transition-all w-full"
                            >
                                Coming Soon
                            </button>
                        </div>

                        <div className="border-t border-zinc-800/80 my-10 w-full"></div>

                        <div>
                            <h4 className="text-sm font-medium text-white font-sans mb-6 uppercase tracking-wider">
                                Everything in Professional, plus:
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Unlimited products
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Real-time updates
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Dedicated support
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-zinc-300 font-sans leading-snug">
                                        Custom integrations
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="overflow-hidden border-dashed text-white bg-black w-full border-zinc-800 border-t relative">
                {/* Main Content Wrapper */}
                <div className="w-full max-w-7xl mx-auto border-x border-dashed border-zinc-800">
                    {/* Top Section: Grid */}
                    <div className="grid lg:grid-cols-12">
                        {/* Left Brand Section */}
                        <div className="lg:col-span-5 p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-dashed border-zinc-800 relative min-h-[360px] [animation:fadeSlideIn_1s_ease-out_0.2s_both] animate-on-scroll">
                            <div>
                                {/* Logo */}
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="grid grid-cols-2 gap-1 w-8 h-8 opacity-90">
                                        <div className="bg-[#22c55e] w-full h-full rounded-sm"></div>
                                        <div className="w-full h-full bg-zinc-700 rounded-sm [animation:fadeSlideIn_1s_ease-out_0.3s_both] animate-on-scroll"></div>
                                        <div className="w-full h-full bg-zinc-800 rounded-sm"></div>
                                        <div className="w-full h-full bg-white rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.4)]"></div>
                                    </div>
                                    <span className="text-2xl font-bold tracking-tight text-white font-sans">
                                        Monitra
                                    </span>
                                </div>

                                <p className="text-zinc-400 max-w-sm text-sm leading-relaxed mb-12 font-medium">
                                    We offer AI-powered price intelligence tools to help businesses effectively track competitor prices, monitor market trends, and make data-driven pricing decisions.
                                </p>
                            </div>

                            {/* Social Icons */}
                            <div className="flex items-center gap-3 mt-auto">
                                <a href="#" className="w-10 h-10 flex items-center justify-center border border-dashed border-zinc-700 hover:border-green-600 hover:bg-green-600/10 hover:text-green-600 transition-all duration-300 rounded text-zinc-400 group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram">
                                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                                    </svg>
                                </a>
                                <a href="#" className="w-10 h-10 flex items-center justify-center border border-dashed border-zinc-700 hover:border-green-600 hover:bg-green-600/10 hover:text-green-600 transition-all duration-300 rounded text-zinc-400 group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter">
                                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                                    </svg>
                                </a>
                                <a href="#" className="w-10 h-10 flex items-center justify-center border border-dashed border-zinc-700 hover:border-green-600 hover:bg-green-600/10 hover:text-green-600 transition-all duration-300 rounded text-zinc-400 group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                                        <path d="M2 12h20"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>

                        {/* Right Links Section */}
                        <div className="lg:col-span-7 p-8 md:p-12 bg-black/50">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 h-full content-start">
                                {/* Column 1 - Map */}
                                <div className="flex flex-col gap-8">
                                    <h4 className="uppercase text-xs font-bold text-[#22c55e] tracking-widest font-sans">
                                        Map
                                    </h4>
                                    <div className="flex flex-col gap-5">
                                        <a href="#features" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            FEATURES
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a>
                                        <a href="#pricing" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            PRICING
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a>
                                        {/* <a href="#testimonials" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            REVIEWS
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a> */}
                                        {/* <a href="#" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            FAQS
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a> */}
                                    </div>
                                </div>

                                {/* Column 2 - Company */}
                                <div className="flex flex-col gap-8">
                                    <h4 className="uppercase text-xs font-bold text-[#22c55e] tracking-widest font-sans">
                                        Company
                                    </h4>
                                    <div className="flex flex-col gap-5">
                                        <a href="/" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            HOME
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a>
                                        
                                        <a href="#pricing" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            PRICING
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a>

                                    </div>
                                </div>

                                {/* Column 3 - Legal */}
                                <div className="flex flex-col gap-8">
                                    <h4 className="uppercase text-xs font-bold text-[#22c55e] tracking-widest font-sans">
                                        Legal
                                    </h4>
                                    <div className="flex flex-col gap-5">
                                        <a href="#" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            PRIVACY POLICY
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a>
                                        <a href="#" className="group flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                            TERMS & CONDITIONS
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-green-600">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Divider */}
                    <div className="w-full border-t border-dashed border-zinc-800"></div>

                    {/* Big Brand Text */}
                    <div className="w-full h-auto py-12 md:py-24 px-4 overflow-hidden flex justify-center items-center relative bg-black select-none [animation:fadeSlideIn_1s_ease-out_0.4s_both] animate-on-scroll">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)] pointer-events-none"></div>

                        <h2 className="text-[14vw] leading-[0.8] font-bold text-transparent tracking-tighter pointer-events-none font-sans" style={{ WebkitTextStroke: '1px rgba(63, 63, 70, 0.5)' }}>
                            MONITRA
                        </h2>

                        {/* Glow Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="w-full py-8 text-center border-t border-dashed border-zinc-800 bg-black z-20 relative [animation:fadeSlideIn_1s_ease-out_0.5s_both] animate-on-scroll">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] font-sans">
                        Powered by RudrX Techlabs
                    </p>
                </div>
            </footer>
        </div>
    );
}
