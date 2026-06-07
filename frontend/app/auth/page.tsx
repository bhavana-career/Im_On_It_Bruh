'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useThemeStore } from '../../store/themeStore';

export default function AuthPage() {
  const { isDark } = useThemeStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [redirectUrl, setRedirectUrl] = useState('/dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redir = params.get('redirect');
      if (redir) {
        setRedirectUrl(redir);
      }
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP code. Please check your email.');
      }

      const data = await response.json();
      setIsOtpSent(true);
      console.log(`[DEBUG] OTP code: ${data.debugCode}`);
      setMessage(`OTP sent successfully! Please check your email inbox.`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) return;

    setLoading(true);
    setError('');

    try {
      // Trigger NextAuth credentials sign-in
      const result = await signIn('credentials', {
        email,
        otp,
        name: isNewUser ? name : undefined,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid OTP code or email. Please check your inputs.');
      } else {
        // Redirect to dashboard on success
        window.location.href = redirectUrl;
      }
    } catch (err: any) {
      setError('Authentication failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground transition-colors duration-300">
      
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] rounded-full bg-primary blur-[80px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] rounded-full bg-accent blur-[80px]" />
      </div>

      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center text-primary mb-4 text-2xl">
            <i className="ti ti-flame" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">I'm On It Bruh</h2>
          <p className="text-sm text-muted-foreground mt-2">AI-powered meeting-to-execution pipeline.</p>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-red-600 bg-red-100/10 rounded-xl border border-red-500/20 text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="p-4 mb-6 text-sm text-primary bg-primary/10 rounded-xl border border-primary/20 text-center">
            {message}
          </div>
        )}

        {/* Content */}
        {!isOtpSent ? (
          <div className="flex flex-col gap-4">
            
            {/* Google OAuth Button */}
            <button
              onClick={() => signIn('google', { callbackUrl: redirectUrl })}
              className="w-full py-3.5 px-4 rounded-xl bg-secondary hover:bg-opacity-80 transition-all font-semibold flex items-center justify-center gap-3 border border-border cursor-pointer"
            >
              <i className="ti ti-brand-google text-lg text-primary" />
              Continue with Google
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 border-t border-border -z-10" />
              <span className="bg-card px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Or</span>
            </div>

            {/* OTP form trigger */}
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              {isNewUser && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Profile Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. John Doe"
                    className="w-full p-3.5 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full p-3.5 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <i className="ti ti-loader animate-spin" /> : 'Continue with Email'}
              </button>
            </form>

            {/* Onboarding swap */}
            <div className="text-center mt-6 text-sm">
              {!isNewUser ? (
                <p className="text-muted-foreground">
                  New to I'm On It Bruh?{' '}
                  <button
                    onClick={() => setIsNewUser(true)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already registered?{' '}
                  <button
                    onClick={() => setIsNewUser(false)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Log in here
                  </button>
                </p>
              )}
            </div>

          </div>
        ) : (
          /* Verification OTP screen */
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit verification code to <span className="font-semibold text-foreground">{email}</span>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="otp" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Verification Code</label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full p-3.5 rounded-xl border border-border bg-muted text-center text-2xl font-bold tracking-[8px] focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <i className="ti ti-loader animate-spin" /> : 'Verify and Log in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOtpSent(false);
                setOtp('');
              }}
              className="w-full py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              Go Back
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
