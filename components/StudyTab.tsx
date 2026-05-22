'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StudyMaterial, Flashcard, QuizQuestion } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  BookOpen,
  Brain,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Trophy,
  ScrollText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface StudyTabProps {
  videoId: string;
}

type StudySubTab = 'flashcards' | 'quiz' | 'notes';

export default function StudyTab({ videoId }: StudyTabProps) {
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<StudySubTab>('flashcards');

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const fetchStudyMaterial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/study?videoId=${videoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setStudyMaterial(data.studyMaterial || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchStudyMaterial();
  }, [fetchStudyMaterial]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setStudyMaterial(data.studyMaterial);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Reset quiz state
  const resetQuiz = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizFinished(false);
    setAnswers(new Array(studyMaterial?.quiz.length || 0).fill(null));
  };

  const handleAnswerSelect = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);
    if (idx === studyMaterial!.quiz[currentQ].correctAnswerIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    const total = studyMaterial!.quiz.length;
    if (currentQ + 1 >= total) {
      setQuizFinished(true);
      const pct = ((score + (selectedAnswer === studyMaterial!.quiz[currentQ].correctAnswerIndex ? 1 : 0)) / total) * 100;
      if (pct >= 70) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    } else {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm font-medium font-outfit">Loading study materials…</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <Card className="glass-panel border-white/5 py-10">
        <CardContent className="flex flex-col items-center space-y-4 text-center">
          <AlertCircle className="h-8 w-8 text-rose-400" />
          <p className="text-rose-300 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchStudyMaterial}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Welcome / Generate CTA ──
  if (!studyMaterial) {
    return (
      <Card className="glass-panel border-white/5 bg-slate-900/20">
        <CardContent className="py-12 flex flex-col items-center text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold font-outfit text-slate-100">Study Mode</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              Transform this video into a complete student study pack — generated by AI in seconds.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg text-left">
            {[
              { icon: <Brain className="h-5 w-5 text-violet-400" />, label: 'Flashcards', desc: '8–12 concept cards with flip animation' },
              { icon: <ClipboardList className="h-5 w-5 text-fuchsia-400" />, label: 'MCQ Quiz', desc: '6–8 questions with explanations & score' },
              { icon: <ScrollText className="h-5 w-5 text-cyan-400" />, label: 'Revision Notes', desc: 'Structured sections and key terms glossary' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  {icon}
                  <span className="font-outfit font-bold text-slate-200 text-sm">{label}</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            onClick={handleGenerate}
            isLoading={generating}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="px-8 py-3.5 text-sm font-bold"
          >
            {generating ? 'Generating Study Pack…' : 'Generate Study Materials'}
          </Button>
          {generating && (
            <p className="text-slate-500 text-xs animate-pulse">
              Gemini is analysing the transcript — this takes about 15–30 seconds…
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const { flashcards, quiz, revision_notes } = studyMaterial;
  const currentCard: Flashcard = flashcards[cardIndex];
  const currentQuestion: QuizQuestion | undefined = quiz[currentQ];

  return (
    <Card className="glass-panel border-white/5 bg-slate-900/10">
      {/* ── Tab Bar ── */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 pt-4 pb-0">
        <div className="flex space-x-1">
          {([
            { key: 'flashcards', label: 'Flashcards', icon: <Brain className="h-4 w-4" /> },
            { key: 'quiz', label: 'Quiz', icon: <ClipboardList className="h-4 w-4" /> },
            { key: 'notes', label: 'Revision Notes', icon: <ScrollText className="h-4 w-4" /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold font-outfit rounded-t-xl tracking-wide transition cursor-pointer border-b-2 ${
                activeTab === key
                  ? 'text-violet-400 border-violet-500 bg-slate-950/40'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          title="Regenerate Study Materials"
          className="mb-1 p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition cursor-pointer"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      <CardContent className="p-6 min-h-[480px]">

        {/* ════════════ FLASHCARDS ════════════ */}
        {activeTab === 'flashcards' && (
          <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-200">
            <p className="text-slate-500 text-xs font-outfit tracking-wider uppercase">
              Card {cardIndex + 1} of {flashcards.length} · Click to flip
            </p>

            {/* 3D Flip Card */}
            <div
              className="relative w-full max-w-xl h-56 cursor-pointer"
              style={{ perspective: '1000px' }}
              onClick={() => setFlipped((f) => !f)}
            >
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <Brain className="h-6 w-6 text-violet-400 mb-3 opacity-60" />
                  <p className="text-slate-100 font-outfit font-semibold text-base sm:text-lg leading-snug">
                    {currentCard?.question}
                  </p>
                  <span className="mt-4 text-slate-600 text-xs">Tap to reveal answer →</span>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-900/50 to-fuchsia-900/40 border border-violet-500/20 flex flex-col items-center justify-center p-8 text-center shadow-2xl"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <CheckCircle2 className="h-6 w-6 text-violet-300 mb-3 opacity-80" />
                  <p className="text-violet-100 font-sans text-sm sm:text-base leading-relaxed">
                    {currentCard?.answer}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}
                disabled={cardIndex === 0}
                className="p-3 bg-slate-800/60 border border-white/5 rounded-xl text-slate-300 hover:bg-slate-700/60 disabled:opacity-30 transition cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Dot indicators */}
              <div className="flex space-x-1.5">
                {flashcards.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCardIndex(i); setFlipped(false); }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === cardIndex ? 'w-6 bg-violet-500' : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => { setCardIndex((i) => Math.min(flashcards.length - 1, i + 1)); setFlipped(false); }}
                disabled={cardIndex === flashcards.length - 1}
                className="p-3 bg-slate-800/60 border border-white/5 rounded-xl text-slate-300 hover:bg-slate-700/60 disabled:opacity-30 transition cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => { setCardIndex(0); setFlipped(false); }}
              className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-300 text-xs transition cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Restart from beginning</span>
            </button>
          </div>
        )}

        {/* ════════════ QUIZ ════════════ */}
        {activeTab === 'quiz' && (
          <div className="animate-in fade-in duration-200">
            {!quizStarted ? (
              /* Quiz intro screen */
              <div className="flex flex-col items-center text-center space-y-6 py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center shadow-xl shadow-fuchsia-500/20">
                  <ClipboardList className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-outfit font-bold text-slate-100 text-xl">Practice Quiz</h4>
                  <p className="text-slate-400 text-sm">{quiz.length} questions · Multiple choice · Instant feedback</p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => { resetQuiz(); setQuizStarted(true); }}
                  className="px-8"
                >
                  Start Quiz
                </Button>
              </div>
            ) : quizFinished ? (
              /* Score screen */
              <div className="flex flex-col items-center text-center space-y-6 py-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-outfit font-bold text-slate-100 text-2xl">Quiz Complete!</h4>
                  <p className="text-slate-400 text-sm">
                    You scored <span className="text-amber-400 font-bold">{score}</span> out of{' '}
                    <span className="text-slate-200 font-bold">{quiz.length}</span>
                  </p>
                </div>

                {/* Score ring */}
                <div className="relative flex items-center justify-center w-28 h-28">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={score / quiz.length >= 0.7 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      strokeDasharray={`${(score / quiz.length) * 263.9} 263.9`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`font-outfit font-extrabold text-2xl ${score / quiz.length >= 0.7 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {Math.round((score / quiz.length) * 100)}%
                  </span>
                </div>

                <p className="text-slate-400 text-sm max-w-xs">
                  {score / quiz.length >= 0.8
                    ? '🌟 Excellent! You have a strong grasp of the material.'
                    : score / quiz.length >= 0.6
                    ? '👍 Good work! Review the incorrect answers to reinforce learning.'
                    : '📚 Keep studying! Try reviewing the flashcards and revision notes.'}
                </p>

                <div className="flex space-x-3">
                  <Button variant="secondary" size="sm" onClick={() => { resetQuiz(); setQuizStarted(true); }}>
                    Retake Quiz
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('notes')}>
                    Review Notes
                  </Button>
                </div>
              </div>
            ) : (
              /* Active question */
              currentQuestion && (
                <div className="space-y-6">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 font-outfit">
                      <span>Question {currentQ + 1} of {quiz.length}</span>
                      <span>Score: {score}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-500"
                        style={{ width: `${((currentQ) / quiz.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                    <p className="text-slate-100 font-outfit font-semibold text-base leading-snug">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => {
                      const isCorrect = idx === currentQuestion.correctAnswerIndex;
                      const isSelected = idx === selectedAnswer;
                      let optStyle = 'bg-slate-900/30 border-white/5 text-slate-300 hover:border-violet-500/40 hover:bg-slate-800/40';
                      if (selectedAnswer !== null) {
                        if (isCorrect) optStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200';
                        else if (isSelected) optStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-200';
                        else optStyle = 'bg-slate-900/20 border-white/5 text-slate-500 opacity-60';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerSelect(idx)}
                          disabled={selectedAnswer !== null}
                          className={`w-full text-left p-4 rounded-xl border text-sm font-sans transition flex items-center space-x-3 cursor-pointer ${optStyle}`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold font-outfit border ${
                            selectedAnswer !== null && isCorrect
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : selectedAnswer !== null && isSelected
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : 'bg-slate-800 border-white/10 text-slate-400'
                          }`}>
                            {['A', 'B', 'C', 'D'][idx]}
                          </span>
                          <span className="flex-1">{option}</span>
                          {selectedAnswer !== null && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                          {selectedAnswer !== null && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {showExplanation && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-200 text-sm leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  )}

                  {selectedAnswer !== null && (
                    <Button variant="primary" onClick={handleNextQuestion} className="w-full">
                      {currentQ + 1 >= quiz.length ? 'View Results →' : 'Next Question →'}
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* ════════════ REVISION NOTES ════════════ */}
        {activeTab === 'notes' && revision_notes && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Overview */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-cyan-400">Overview</h4>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed bg-slate-900/40 border border-white/5 p-4 rounded-xl font-sans">
                {revision_notes.overview}
              </p>
            </div>

            {/* Sections */}
            {revision_notes.sections && revision_notes.sections.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">Study Sections</h4>
                <div className="space-y-4">
                  {revision_notes.sections.map((section, idx) => (
                    <div key={idx} className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xs font-bold font-outfit">
                          {idx + 1}
                        </span>
                        <h5 className="font-outfit font-bold text-slate-100 text-sm">{section.title}</h5>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-sans">{section.content}</p>
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="space-y-1.5 pt-1">
                          {section.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="flex items-start space-x-2 text-slate-400 text-sm">
                              <span className="text-violet-400 font-bold mt-0.5 flex-shrink-0">›</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Terms Glossary */}
            {revision_notes.keyTerms && revision_notes.keyTerms.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <ScrollText className="h-4 w-4 text-fuchsia-400" />
                  <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-fuchsia-400">Key Terms Glossary</h4>
                </div>
                <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden">
                  {revision_notes.keyTerms.map((item, idx) => (
                    <div key={idx} className="flex items-start p-4 bg-slate-900/20 hover:bg-slate-900/40 transition">
                      <div className="w-1/3 flex-shrink-0 pr-4">
                        <span className="font-outfit font-bold text-fuchsia-300 text-sm">{item.term}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-300 text-sm font-sans leading-relaxed">{item.definition}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
