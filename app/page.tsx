'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Mic, 
  Share2, 
  MessageSquare,
  Lock, 
  PlayCircle,
  Clock,
  ListFilter
} from 'lucide-react';

export default function LandingPage() {
  const supabase = getSupabaseBrowserClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
      {/* Background grids and glowing mesh */}
      <div className="bg-mesh"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      {/* Top Navbar */}
      <header className="h-20 border-b border-white/5 backdrop-blur-md flex items-center justify-between px-6 md:px-12 relative z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2.5 rounded-xl text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            VidBrief AI
          </span>
        </div>

        <div>
          <Link href={isLoggedIn ? '/dashboard' : '/login'}>
            <Button variant="secondary" className="border-white/5 hover:border-violet-500/30">
              {isLoggedIn ? 'Go to Dashboard' : 'Authenticate Session'}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 md:py-28 relative z-10 max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold font-outfit uppercase tracking-wider mb-6 animate-pulse">
          <Zap className="h-3.5 w-3.5" />
          <span>Announcing VidBrief AI v1.0</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-outfit tracking-tight leading-[1.1] mb-6">
          Convert Long Videos into{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            High Fidelity Briefings
          </span>{' '}
          Instantly
        </h1>

        <p className="text-slate-400 text-base sm:text-xl max-w-2xl font-sans leading-relaxed mb-10">
          Upload MP4 video files or paste YouTube URLs. Our automated pipeline extracts audio, transcribes with Whisper, and synthesizes key briefings, timestamped chapters, articles, and ready-to-post LinkedIn/Twitter content.
        </p>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 justify-center">
          <Link href={isLoggedIn ? '/dashboard' : '/login'}>
            <Button variant="primary" size="lg" className="px-8 py-4 text-sm font-semibold flex items-center space-x-2">
              <span>{isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="ghost" size="lg" className="text-slate-400 hover:text-slate-200">
              Explore Product Features
            </Button>
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 pt-12 border-t border-white/5">
          <Card hoverGlow className="text-left bg-slate-900/20 border-white/5">
            <div className="h-10 w-10 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4.5">
              <Mic className="h-5 w-5" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-slate-100">Speech-To-Text</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              OpenAI Whisper extracts dialogue with high-fidelity accuracy, outputting full timestamps and case-insensitive searchability.
            </p>
          </Card>

          <Card hoverGlow className="text-left bg-slate-900/20 border-white/5">
            <div className="h-10 w-10 rounded-xl bg-fuchsia-600/15 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-4.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-slate-100">Structured AI Briefs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gemini 1.5 Flash generates actionable bullet notes, short descriptions, and custom logical chapters with visual seconds tracking.
            </p>
          </Card>

          <Card hoverGlow className="text-left bg-slate-900/20 border-white/5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4.5">
              <Share2 className="h-5 w-5" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-slate-100">SaaS Content Tools</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Instantly create engaging LinkedIn posts and professional Twitter/X threads directly from your briefings with copy-paste actions.
            </p>
          </Card>
        </div>
      </section>

      {/* Product Mock Section */}
      <section className="bg-slate-950/60 border-t border-white/5 py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-outfit mb-4">Inside the Briefing Engine</h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              VidBrief AI acts as your virtual chief-of-staff, creating rich visual reports, exporting PDFs, and offering an interactive AI Chat to ask questions about your videos.
            </p>
          </div>

          <div className="relative rounded-2xl border border-white/5 bg-slate-900/30 overflow-hidden shadow-2xl p-2.5 max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/10 via-transparent to-fuchsia-600/10 z-0"></div>
            <div className="relative z-10 glass-panel rounded-xl overflow-hidden p-6 text-left border-white/5">
              {/* Fake Window bar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="h-3.5 w-3.5 rounded-full bg-rose-500/30"></div>
                  <div className="h-3.5 w-3.5 rounded-full bg-amber-500/30"></div>
                  <div className="h-3.5 w-3.5 rounded-full bg-emerald-500/30"></div>
                </div>
                <div className="px-4 py-1 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] font-outfit text-slate-400">
                  vidbrief-briefing-mockup.pdf
                </div>
                <div className="h-4 w-4 text-slate-500"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Executive Summary</span>
                    <h4 className="font-outfit font-bold text-lg text-slate-100">Next.js 14 and Server Actions Architecture</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      This video explains how Server Actions fully eliminate the need for custom REST endpoints in React components, providing built-in forms optimization, strict server security validation, and instant mutations sync.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-400">Key Takeaways</span>
                    <ul className="text-xs text-slate-300 space-y-2 font-sans">
                      <li className="flex items-start space-x-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 mt-1.5 flex-shrink-0"></span>
                        <span>Server Actions run purely on server nodes, protecting environmental credentials and DB access.</span>
                      </li>
                      <li className="flex items-start space-x-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 mt-1.5 flex-shrink-0"></span>
                        <span>Seamless integration with HTML5 forms provides zero-JavaScript fallback operations.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Interactive Chatbot</span>
                  <div className="p-3 bg-slate-950/80 border border-white/5 rounded-xl text-[11px] space-y-2.5 font-sans">
                    <p className="text-slate-400 italic">User: "What does he say about REST?"</p>
                    <p className="text-violet-300 leading-relaxed">
                      "The speaker emphasizes that REST is not obsolete, but for Next.js internal mutations, Server Actions provide a safer and significantly more type-safe channel."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-slate-500 text-xs font-sans mt-auto">
        <p>© 2026 VidBrief AI. Powered by Next.js 14, Supabase, Whisper & Google Gemini. All rights reserved.</p>
      </footer>
    </div>
  );
}
