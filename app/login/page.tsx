'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Sparkles, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/dashboard');
      }
    }
    checkUser();
  }, [supabase, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter all required fields.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up Flow
        if (!fullName) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // If email confirmation is enabled, notify user. Otherwise they are logged in.
        if (data.user && data.session === null) {
          setSuccessMsg('Registration successful! Please check your email inbox to confirm your account.');
        } else {
          setSuccessMsg('Account registered successfully! Redirecting...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        }
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg('Success! Entering VidBrief dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="bg-mesh"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-gradient-to-r from-violet-600 to-fuchsia-600 p-3 rounded-2xl text-white shadow-xl shadow-violet-500/25 mb-4 animate-bounce-slow">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold font-outfit tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            VidBrief AI
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
            High Fidelity Video Summaries & Social Media Assets Instantly
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass-panel shadow-2xl border-white/5 bg-slate-900/40" hoverGlow={false}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{isSignUp ? 'Create SaaS Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Enter your details below to get started' : 'Sign in to access your video briefings'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase pl-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase pl-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full py-3.5 mt-2" isLoading={loading}>
                {isSignUp ? 'Create SaaS Account' : 'Authenticate Session'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-sm text-violet-400 hover:text-violet-300 transition font-medium"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'New to VidBrief? Register Here'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
