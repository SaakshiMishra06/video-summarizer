'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/lib/utils';
import { VideoSummary } from '@/types';
import { jsPDF } from 'jspdf';
import { 
  Sparkles, 
  FileText, 
  Linkedin, 
  Twitter, 
  Check, 
  Copy, 
  Download, 
  BookOpen, 
  Milestone,
  CheckCircle,
  Lightbulb
} from 'lucide-react';

interface SummaryTabProps {
  summary: VideoSummary;
  videoTitle: string;
  onChapterClick?: (seconds: number) => void;
}

export default function SummaryTab({ summary, videoTitle, onChapterClick }: SummaryTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'brief' | 'chapters' | 'social'>('brief');
  const [linkedinCopied, setLinkedinCopied] = useState(false);
  const [twitterCopied, setTwitterCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopyLinkedin = async () => {
    if (!summary.linkedin_post) return;
    try {
      await navigator.clipboard.writeText(summary.linkedin_post);
      setLinkedinCopied(true);
      setTimeout(() => setLinkedinCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy LinkedIn post:', err);
    }
  };

  const handleCopyTwitter = async () => {
    if (!summary.twitter_thread) return;
    try {
      const fullThreadText = summary.twitter_thread.join('\n\n---\n\n');
      await navigator.clipboard.writeText(fullThreadText);
      setTwitterCopied(true);
      setTimeout(() => setTwitterCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy Twitter thread:', err);
    }
  };

  // Premium jsPDF Exporter
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors Configuration
      const primaryColor = '#7c3aed'; // Violet 600
      const textColor = '#0f172a'; // Slate 900
      const mutedColor = '#64748b'; // Slate 500

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Title Section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor);
      doc.text('VidBrief AI - Video Summary Report', margin, 25);

      // Metadata Section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(textColor);
      doc.text('Video Title: ', margin, 36);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor('#1e293b');
      // Wrap video title if it's too long
      const wrappedTitle = doc.splitTextToSize(videoTitle, contentWidth - 25);
      doc.text(wrappedTitle, margin + 25, 36);
      
      const titleLines = wrappedTitle.length;
      let yOffset = 36 + (titleLines * 5) + 2;

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(textColor);
      doc.text('Generated At: ', margin, yOffset);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(mutedColor);
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin + 27, yOffset);

      yOffset += 8;
      // Draw horizontal separating line
      doc.setDrawColor('#e2e8f0');
      doc.setLineWidth(0.5);
      doc.line(margin, yOffset, pageWidth - margin, yOffset);
      
      yOffset += 10;

      // 1. Executive Summary
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor);
      doc.text('1. Executive Briefing', margin, yOffset);
      yOffset += 6;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor('#334155');
      const wrappedShort = doc.splitTextToSize(summary.short_summary, contentWidth);
      doc.text(wrappedShort, margin, yOffset);
      yOffset += (wrappedShort.length * 5) + 8;

      // 2. Detailed Summary
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor);
      doc.text('2. Detailed Analysis', margin, yOffset);
      yOffset += 6;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor('#334155');
      const wrappedDetailed = doc.splitTextToSize(summary.detailed_summary, contentWidth);
      
      // Auto-page wrapping check
      for (let i = 0; i < wrappedDetailed.length; i++) {
        if (yOffset > pageHeight - margin - 15) {
          doc.addPage();
          yOffset = 25; // Reset top offset for next page
        }
        doc.text(wrappedDetailed[i], margin, yOffset);
        yOffset += 5.2;
      }
      yOffset += 8;

      // 3. Bullet Point Notes
      if (summary.bullet_points && summary.bullet_points.length > 0) {
        if (yOffset > pageHeight - margin - 30) {
          doc.addPage();
          yOffset = 25;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.text('3. Core Explanations', margin, yOffset);
        yOffset += 7;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor('#334155');

        summary.bullet_points.forEach((bullet) => {
          const bulletText = `•  ${bullet}`;
          const wrappedBullet = doc.splitTextToSize(bulletText, contentWidth - 4);
          
          for (let k = 0; k < wrappedBullet.length; k++) {
            if (yOffset > pageHeight - margin - 10) {
              doc.addPage();
              yOffset = 25;
            }
            // Indent wrapped lines slightly for clean list visual
            doc.text(wrappedBullet[k], k === 0 ? margin : margin + 4, yOffset);
            yOffset += 5;
          }
          yOffset += 2; // Spacing between bullets
        });
        yOffset += 6;
      }

      // 4. Actionable Insights
      if (summary.key_insights && summary.key_insights.length > 0) {
        if (yOffset > pageHeight - margin - 30) {
          doc.addPage();
          yOffset = 25;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.text('4. Actionable Learnings', margin, yOffset);
        yOffset += 7;

        summary.key_insights.forEach((insight) => {
          const insightText = `*  ${insight}`;
          const wrappedInsight = doc.splitTextToSize(insightText, contentWidth - 4);
          
          for (let k = 0; k < wrappedInsight.length; k++) {
            if (yOffset > pageHeight - margin - 10) {
              doc.addPage();
              yOffset = 25;
            }
            doc.text(wrappedInsight[k], k === 0 ? margin : margin + 4, yOffset);
            yOffset += 5;
          }
          yOffset += 2;
        });
        yOffset += 6;
      }

      // 5. Chapters Timeline
      if (summary.chapters && summary.chapters.length > 0) {
        if (yOffset > pageHeight - margin - 30) {
          doc.addPage();
          yOffset = 25;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.text('5. Chapters Timeline', margin, yOffset);
        yOffset += 7;

        summary.chapters.forEach((chapter) => {
          if (yOffset > pageHeight - margin - 20) {
            doc.addPage();
            yOffset = 25;
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(textColor);
          doc.text(`[${chapter.timestamp}] - ${chapter.title}`, margin, yOffset);
          yOffset += 5.2;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor('#475569');
          const wrappedDesc = doc.splitTextToSize(chapter.description, contentWidth - 6);
          
          for (let j = 0; j < wrappedDesc.length; j++) {
            if (yOffset > pageHeight - margin - 10) {
              doc.addPage();
              yOffset = 25;
            }
            doc.text(wrappedDesc[j], margin + 6, yOffset);
            yOffset += 4.5;
          }
          yOffset += 3.5;
        });
      }

      // Add footer to pages
      const pageCount = doc.internal.pages.length - 1;
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(mutedColor);
        doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin - 12, pageHeight - 10);
        doc.text('Generated via VidBrief AI Summarizer', margin, pageHeight - 10);
      }

      // Save PDF
      doc.save(`vidbrief-report-${summary.video_id}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Could not export PDF summary report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="glass-panel border-white/5 bg-slate-900/10 flex flex-col min-h-[600px]">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 gap-4">
        {/* Navigation Sub-Tabs */}
        <div className="flex border border-white/5 bg-slate-950/60 rounded-xl p-0.5 max-w-sm w-full">
          <button
            onClick={() => setActiveSubTab('brief')}
            className={`flex-1 py-2 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition ${
              activeSubTab === 'brief'
                ? 'bg-slate-900 border border-white/5 text-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            SaaS Briefing
          </button>
          <button
            onClick={() => setActiveSubTab('chapters')}
            className={`flex-1 py-2 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition ${
              activeSubTab === 'chapters'
                ? 'bg-slate-900 border border-white/5 text-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Chapters
          </button>
          <button
            onClick={() => setActiveSubTab('social')}
            className={`flex-1 py-2 text-xs font-semibold font-outfit rounded-lg tracking-wider uppercase cursor-pointer transition ${
              activeSubTab === 'social'
                ? 'bg-slate-900 border border-white/5 text-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Creator Studio
          </button>
        </div>

        {/* Global Export actions */}
        <div>
          <Button
            variant="glass"
            size="sm"
            onClick={handleExportPDF}
            isLoading={isExporting}
            leftIcon={<Download className="h-4.5 w-4.5" />}
            className="w-full md:w-auto text-xs font-semibold"
          >
            {isExporting ? 'Generating PDF...' : 'Download Briefing PDF'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 overflow-y-auto">
        {/* 1. Briefing Tab */}
        {activeSubTab === 'brief' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Executive Short Summary */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4.5 w-4.5 text-violet-400" />
                <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-violet-400">
                  Executive Briefing
                </h4>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed font-sans bg-slate-950/40 p-4 rounded-xl border border-white/5 shadow-inner">
                {summary.short_summary}
              </p>
            </div>

            {/* Detailed Summary */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                Detailed Analysis
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed font-sans whitespace-pre-wrap">
                {summary.detailed_summary}
              </p>
            </div>

            {/* Bullet Point Notes */}
            {summary.bullet_points && summary.bullet_points.length > 0 && (
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                  <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                    Core Explanations
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3 font-sans">
                  {summary.bullet_points.map((point, index) => (
                    <div key={index} className="flex space-x-3 text-slate-300 text-sm leading-normal">
                      <span className="text-violet-400 font-bold select-none">•</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Insights */}
            {summary.key_insights && summary.key_insights.length > 0 && (
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4.5 w-4.5 text-amber-400" />
                  <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                    Actionable Learnings
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3 font-sans">
                  {summary.key_insights.map((insight, index) => (
                    <div key={index} className="bg-slate-950/30 border border-white/5 p-4 rounded-xl flex items-start space-x-3">
                      <div className="mt-0.5 bg-amber-500/10 text-amber-400 p-1.5 rounded-lg">
                        <Lightbulb className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-slate-300 text-sm leading-relaxed">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Chapters Tab */}
        {activeSubTab === 'chapters' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {summary.chapters && summary.chapters.length > 0 ? (
              /* Chronological vertical timeline */
              <div className="relative border-l-2 border-slate-800 ml-4.5 py-2 pl-6 space-y-8 font-sans">
                {summary.chapters.map((chapter, index) => (
                  <div key={index} className="relative">
                    {/* Timestamp Dot indicator */}
                    <button
                      onClick={() => onChapterClick && onChapterClick(chapter.timeInSeconds)}
                      className="absolute -left-[38px] top-0.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-violet-500/40 text-[9px] font-mono font-bold text-violet-400 hover:text-violet-300 transition shadow"
                    >
                      {chapter.timestamp}
                    </button>
                    
                    <div className="space-y-1.5 pl-2">
                      <h4 
                        onClick={() => onChapterClick && onChapterClick(chapter.timeInSeconds)}
                        className="font-outfit font-bold text-slate-200 hover:text-violet-400 transition cursor-pointer text-sm sm:text-base"
                      >
                        {chapter.title}
                      </h4>
                      <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                        {chapter.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <Milestone className="h-8 w-8 mx-auto text-slate-700 animate-pulse" />
                <p className="text-xs font-medium font-outfit">Timeline chapters not generated for this brief.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Creator Studio Tab */}
        {activeSubTab === 'social' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* LinkedIn Copy Creator */}
            {summary.linkedin_post && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-violet-400">
                    <Linkedin className="h-4.5 w-4.5 text-[#0077b5]" />
                    <h4 className="text-xs font-bold font-outfit uppercase tracking-wider">
                      LinkedIn Post Creator
                    </h4>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLinkedin}
                    className="text-slate-400 hover:text-slate-200"
                    leftIcon={linkedinCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  >
                    {linkedinCopied ? 'Copied Post' : 'Copy'}
                  </Button>
                </div>
                
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap bg-slate-950/40 p-5 rounded-2xl border border-white/5 max-h-[300px] overflow-y-auto">
                  {summary.linkedin_post}
                </p>
              </div>
            )}

            {/* Twitter Thread Copy Creator */}
            {summary.twitter_thread && summary.twitter_thread.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Twitter className="h-4.5 w-4.5 text-[#1da1f2]" />
                    <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                      Twitter Thread Generator
                    </h4>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTwitter}
                    className="text-slate-400 hover:text-slate-200"
                    leftIcon={twitterCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  >
                    {twitterCopied ? 'Copied Thread' : 'Copy Thread'}
                  </Button>
                </div>

                <div className="space-y-4">
                  {summary.twitter_thread.map((tweet, idx) => (
                    <div key={idx} className="bg-slate-950/30 border border-white/5 p-4 rounded-xl flex items-start space-x-3.5 font-sans relative">
                      <span className="absolute right-3.5 top-3.5 text-[9px] font-mono font-semibold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                        Tweet {idx + 1}/{summary.twitter_thread?.length}
                      </span>
                      <div className="h-8 w-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-[10px] text-violet-400 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pr-10 pt-1">
                        {tweet}
                      </p>
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
