'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';

// Landing Page Section Components

export default function LandingPage() {
  const { isDark, toggleTheme } = useThemeStore();
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    { title: 'Native Meeting', desc: 'Meetings occur natively inside the platform. Audio streams are captured in real-time.', icon: 'ti-video' },
    { title: 'Gemini Transcription', desc: 'Gemini transcribes and processes raw meeting conversation, labeling speaker identities.', icon: 'ti-keyboard' },
    { title: 'Structured Analysis', desc: 'Summary, outcomes, decisions, tasks, and deadlines are extracted automatically.', icon: 'ti-brain' },
    { title: 'Admin Review Gate', desc: 'Human-in-the-loop: Admin approves or overrides AI suggestions. No automatic distribution.', icon: 'ti-shield-lock' },
    { title: 'Task Distribution', desc: 'Tasks are assigned to members with Google Calendar synchronization and alerts.', icon: 'ti-checkbox' },
    { title: 'Verified Completion', desc: 'Assignees submit deliverables. Admin approves closure, maintaining an immutable audit log.', icon: 'ti-circle-check' },
  ];

  const benefits = [
    { title: 'Enforced Accountability', desc: 'Task statuses are highly structured: assigned, blocked, pending review, completed. No task is forgotten.', icon: 'ti-activity' },
    { title: 'Gemini AI Analysis', desc: 'Automates extraction of action items from transcripts. No more manual meeting minutes.', icon: 'ti-cpu' },
    { title: 'Structured Execution', desc: 'Direct, focused pipeline. Eliminates the gap between planning and execution.', icon: 'ti-trending-up' },
    { title: 'Dependency Engine', desc: 'Link dependent tasks (e.g. Backend API blocker for Frontend). Blocked assignees are unblocked automatically.', icon: 'ti-git-merge' },
    { title: 'Submission Verification', desc: 'Provides a structured portal for members to submit files or Drive links, and admins to approve or reject with comments.', icon: 'ti-file-certificate' },
  ];

  const contrasts = [
    { feature: 'Conversation to Action', generic: 'Lost in group chat messages', imonit: 'Automatically mapped to structured tasks' },
    { feature: 'Actionable Accountability', generic: 'Self-reported checkmarks', imonit: 'Submissions verified and approved by admins' },
    { feature: 'Communication Path', generic: 'Cluttered chat threads & gossip', imonit: 'Dedicated Broadcasts & private Admin replies' },
    { feature: 'Task Dependencies', generic: 'Manual scheduling', imonit: 'Task status unblocks automatically upon blocker approval' },
    { feature: 'Meeting Records', generic: 'Manual minutes / recording links', imonit: 'AI transcript, memory logs, and Google Calendar sync' },
  ];

  const features = [
    { title: 'LiveKit RTC Meetings', desc: 'Platform-native WebRTC video calling with active speaker tracking and audio recording.', icon: 'ti-video-plus' },
    { title: 'Gemini 1.5 Pro pipeline', desc: 'Multimodal STT and deep analysis mapping assignees, deadlines, and dependencies.', icon: 'ti-device-sim-card' },
    { title: 'Task Dependency Chains', desc: 'Enforces sequential workflow execution. Task B remains blocked until Task A is approved.', icon: 'ti-link' },
    { title: 'Google Drive Storage', desc: 'Store task submissions in structured folders on Google Drive with custom access rules.', icon: 'ti-brand-google-drive' },
    { title: 'SendGrid & WhatsApp Alerts', desc: 'Instant dispatch of transactional notifications for task updates and reminders.', icon: 'ti-bell-ringing' },
    { title: 'Analytics Dashboard', desc: 'Track task completion latency, average revision counts, and participant attendance.', icon: 'ti-chart-bar' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-primary to-transparent blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-accent to-transparent blur-[120px]" />
      </div>

      {/* Floating Navbar */}
      <nav className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <i className="ti ti-flame text-primary text-2xl animate-pulse" />
          <span className="font-bold tracking-tight text-lg">I'm On It Bruh</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-secondary text-foreground hover:bg-opacity-80 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            <i className={`ti ${isDark ? 'ti-sun' : 'ti-moon'} text-lg`} />
          </button>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <header className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-6 py-20 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-primary font-medium text-xs mb-6 uppercase tracking-wider">
            <i className="ti ti-cpu-secondary" /> Powered by Gemini 1.5 Pro
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            The Meeting-To-Execution <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Pipeline, Enforced.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop losing action items in endless chat logs. I'm On It Bruh is the definitive meeting analysis, task-dependency, and human-verified accountability system.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/auth"
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 shadow-lg glow-hover transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              Enter Dashboard <i className="ti ti-arrow-right" />
            </Link>
            <a
              href="#vision"
              className="px-8 py-4 rounded-full bg-secondary text-foreground font-semibold hover:bg-opacity-80 transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              See How It Works <i className="ti ti-arrow-down" />
            </a>
          </div>
        </motion.div>
      </header>

      {/* Section 2: Product Vision */}
      <section id="vision" className="py-24 px-6 border-b border-border max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Product Vision</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            Meetings should produce commitments, not conversations.
          </h2>
          <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
            Modern teams waste hours discussing deliverables in meetings, only to forget the commitments by the next morning. Conversations are unstructured, and generic project tools rely on manual inputs.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We bridge this gap. By combining native WebRTC meetings, speaker-aware transcription, Gemini AI analysis, and a strict admin review gate, we turn verbal promises into immutable execution workflows.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative h-[350px] rounded-2xl bg-gradient-to-br from-secondary to-muted border border-border p-8 overflow-hidden flex flex-col justify-center"
        >
          <div className="absolute top-4 right-4 text-primary opacity-20"><i className="ti ti-quote text-7xl" /></div>
          <p className="text-2xl font-bold tracking-tight mb-4 text-foreground italic">
            &ldquo;This is NOT a chat platform. It is NOT a standard project tracker. It is a strict accountability system.&rdquo;
          </p>
          <div className="h-1 w-12 bg-primary mb-4" />
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Authoritative Blueprint</span>
        </motion.div>
      </section>

      {/* Section 3: Benefits */}
      <section className="py-24 px-6 border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Core Strengths</span>
            <h2 className="text-3xl md:text-5xl font-extrabold">Built for Radical Execution</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6 }}
                className="p-8 rounded-2xl bg-card border border-border flex flex-col hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 text-2xl">
                  <i className={`ti ${benefit.icon}`} />
                </div>
                <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Why This Is Different */}
      <section className="py-24 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Platform Contrast</span>
            <h2 className="text-3xl md:text-5xl font-extrabold">How We Contrast with Generic Tools</h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className="p-6 font-bold text-sm uppercase tracking-wider text-foreground">Platform Feature</th>
                  <th className="p-6 font-bold text-sm uppercase tracking-wider text-muted-foreground">Generic Team Tools</th>
                  <th className="p-6 font-bold text-sm uppercase tracking-wider text-primary">I'm On It Bruh</th>
                </tr>
              </thead>
              <tbody>
                {contrasts.map((c, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-6 font-bold text-foreground">{c.feature}</td>
                    <td className="p-6 text-muted-foreground">{c.generic}</td>
                    <td className="p-6 font-medium text-foreground bg-primary/5 border-l border-primary/20">{c.imonit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: AI Workflow Visualization */}
      <section className="py-24 px-6 border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Interactive Engine</span>
            <h2 className="text-3xl md:text-5xl font-extrabold">Explore the AI Pipeline</h2>
            <p className="text-muted-foreground mt-4">Click each workflow node below to examine how audio records convert into approved executions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left selector */}
            <div className="flex flex-col gap-4">
              {workflowSteps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveWorkflowStep(idx)}
                  className={`p-4 rounded-xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
                    activeWorkflowStep === idx
                      ? 'border-primary bg-primary/10 font-bold'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    activeWorkflowStep === idx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}>
                    0{idx + 1}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{step.title}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Center workflow details view */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-card border border-border min-h-[300px] flex flex-col justify-center relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeWorkflowStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 text-3xl">
                    <i className={`ti ${workflowSteps[activeWorkflowStep].icon}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    Stage 0{activeWorkflowStep + 1}: {workflowSteps[activeWorkflowStep].title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {workflowSteps[activeWorkflowStep].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Meeting To Execution Flow */}
      <section className="py-24 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">The Blueprint Flow</span>
            <h2 className="text-3xl md:text-5xl font-extrabold">A Clear Journey to Done</h2>
          </div>

          <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 max-w-5xl mx-auto">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-[25px] left-8 right-8 h-0.5 bg-border -z-10" />

            {[
              { num: '1', title: 'Schedule Meeting', who: 'Admin' },
              { num: '2', title: 'Start Room & Call', who: 'LiveKit SDK' },
              { num: '3', title: 'Gemini STT & Extract', who: 'Gemini 1.5' },
              { num: '4', title: 'Verify & Publish', who: 'Admin Review Gate' },
              { num: '5', title: 'Submit Deliverable', who: 'Assignee User' },
              { num: '6', title: 'Approve & Close', who: 'Admin Approval' },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center max-w-[150px]">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md">
                  {step.num}
                </div>
                <div className="mt-4 font-bold text-sm">{step.title}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase font-medium">{step.who}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Feature Highlights */}
      <section className="py-24 px-6 border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Feature Highlights</span>
            <h2 className="text-3xl md:text-5xl font-extrabold">All Core Capabilities Included</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors" />
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 text-2xl">
                  <i className={`ti ${feat.icon}`} />
                </div>
                <h3 className="text-xl font-bold mb-4">{feat.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8: CTA Section */}
      <section className="py-24 px-6 text-center bg-gradient-to-br from-background to-muted relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-3xl mx-auto">
          <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Get Started</span>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">Ready to Align Your Execution?</h2>
          
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join academic teams, course classrooms, and high-velocity startup groups today. Experience real accountability.
          </p>

          <div className="mt-12 flex justify-center gap-8 text-xs text-muted-foreground uppercase font-semibold tracking-wider">
            <span>Student Groups</span>
            <span>Startup Teams</span>
            <span>Volunteer Communities</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted-foreground border-t border-border">
        <p>I'm On It Bruh &copy; 2026. All rights reserved. Authoritative product blueprint reference.</p>
      </footer>
    </div>
  );
}
