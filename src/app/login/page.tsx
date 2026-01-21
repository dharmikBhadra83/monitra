'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// @ts-ignore
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brain, Chrome, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Check for error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      if (errorParam === 'ConfigurationError') {
        setError('Authentication is not properly configured. Please check your environment variables.');
      } else {
        setError(`Authentication error: ${errorParam}`);
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error: any) {
      console.error('Sign in error:', error);
      alert(`Sign in failed: ${error.message || 'Unknown error'}. Please check your configuration.`);
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[var(--color-black-bg)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-transparent rounded-2xl overflow-hidden border-2 border-[#404040] p-8 relative">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-red-opacity)] border-2 border-[var(--color-red-border)] flex items-center justify-center">
                <Brain className="w-10 h-10 text-[var(--color-red-primary)]" />
              </div>
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-2xl bg-[var(--color-red-primary)] opacity-20 blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-[var(--color-black-text)] mb-2"
            >
              Welcome Back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-[var(--color-black-text-muted)]"
            >
              Sign in to access your competitor price intelligence dashboard
            </motion.p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-500 mb-1">Configuration Error</p>
                <p className="text-xs text-green-400">{error}</p>
                <p className="text-xs text-green-300 mt-2">
                  Please check your .env.local file and ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET are set.
                </p>
              </div>
            </motion.div>
          )}

          {/* Google Sign In Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading || !!error}
              className="cursor-pointer w-full h-14 bg-[var(--color-black-card)] hover:bg-[var(--color-black-card-hover)] border-2 border-[var(--color-black-border)] hover:border-[var(--color-red-border)] text-[var(--color-black-text)] font-semibold text-base transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Chrome className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                  Continue with Google
                </>
              )}
            </Button>
          </motion.div>

          {/* Decorative Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <motion.div
              className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-red-primary)] opacity-5 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 20, 0],
                y: [0, -20, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--color-red-primary)] opacity-5 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
                x: [0, -15, 0],
                y: [0, 15, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </Card>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[var(--color-black-text-muted)]">
            Powered by AI-Powered Intelligence
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
