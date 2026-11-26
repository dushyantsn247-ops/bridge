import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Briefcase, Eye, EyeOff, Sparkles } from 'lucide-react';
import { BridgeHeroScene } from '../../components/three/BridgeHeroScene';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { User, UserRole } from '../../types/domain';

function routeAfterAuth(user: User): string {
  if (user.role === 'admin') return '/admin';
  if (!user.onboardingCompleted) {
    return user.role === 'brand' ? '/onboarding/brand' : '/onboarding/creator';
  }
  return user.role === 'brand' ? '/brand' : '/creator';
}

const AuthLeftShowcase: React.FC<{ headline: string; subtext: string }> = ({
  headline,
  subtext,
}) => (
  <div className="hidden lg:flex lg:w-1/2 relative bg-[#050509] border-r border-white/8 flex-col justify-between p-12 overflow-hidden">
    <div className="absolute inset-0 z-0">
      <BridgeHeroScene variant="auth" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#050509] via-[#050509]/35 to-[#050509]/75"
      />
    </div>

    <div className="relative z-10">
      <Link
        to="/"
        className="font-display text-lg font-bold tracking-[0.18em] text-[#F5F5FA]"
      >
        BRIDGE
      </Link>
    </div>

    <div className="relative z-10 space-y-4 max-w-md">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
        Creator × Brand Intelligence
      </p>
      <h2
        style={{ textWrap: 'balance' }}
        className="font-display text-4xl font-extrabold tracking-tight text-[#F5F5FA] leading-[1.06]"
      >
        {headline}
      </h2>
      <p className="text-base text-[#9295A9]">{subtext}</p>
    </div>

    <div className="relative z-10 flex items-center gap-3 text-xs text-[#9295A9]">
      <span>10K–50K Emerging Talent</span>
      <span aria-hidden="true">·</span>
      <span>INR (₹) Deal Rooms</span>
      <span aria-hidden="true">·</span>
      <span>Deterministic AI Match</span>
    </div>
  </div>
);

// ==========================================
// 1. LOGIN PAGE
// ==========================================
export const LoginPage: React.FC = () => {
  const { login, demoLogin, googleLogin } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@') || !password) {
      setError('Please enter a valid email address and password.');
      return;
    }
    setLoading(true);
    try {
      const u = await login(email, password);
      navigate(routeAfterAuth(u));
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    setError('');
    setLoading(true);
    try {
      const u = await demoLogin(role);
      navigate(routeAfterAuth(u));
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await googleLogin('creator');
      navigate(routeAfterAuth(u));
    } catch (err: any) {
      setError(err.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050509] text-[#F5F5FA]">
      <AuthLeftShowcase
        headline="YOUR NEXT CONNECTION STARTS HERE."
        subtext="One platform. Endless creative possibilities."
      />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2">
            <Link
              to="/"
              className="inline-block font-display text-base font-bold tracking-[0.18em] text-[#00D5FF]"
            >
              BRIDGE
            </Link>
            <h1 className="font-display text-3xl font-bold text-[#F5F5FA]">
              Welcome back.
            </h1>
            <p className="text-sm text-[#9295A9]">Your next opportunity is waiting.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 px-4 py-3 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-[#F5F5FA]">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.in"
                className="w-full px-4 py-3 rounded-lg bg-[#101426] border border-white/12 text-sm text-[#F5F5FA] placeholder-[#9295A9]/60 focus:outline-none focus:border-[#246BFD] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-xs font-medium text-[#F5F5FA]"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#00D5FF] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-lg bg-[#101426] border border-white/12 text-sm text-[#F5F5FA] focus:outline-none focus:border-[#246BFD] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9295A9] hover:text-[#F5F5FA] p-1 cursor-pointer"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#9295A9] cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded accent-[#246BFD]"
              />
              Remember session on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] font-display text-xs font-bold tracking-[0.14em] uppercase text-[#F5F5FA] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Log In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogle}
            className="w-full py-3 rounded-lg bg-[#101426] hover:bg-[#171B2C] border border-white/15 text-xs font-semibold text-[#F5F5FA] transition-colors cursor-pointer"
          >
            Continue with Google (Local Auth Adapter)
          </button>

          {/* One-Click Demo Accounts */}
          <div className="rounded-xl bg-[#0B0D18] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F5F5FA]">
                Instant Demo Accounts
              </span>
              <span className="text-[#00D5FF]">Seeded Indian Data</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['creator', 'brand', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemo(r)}
                  className="py-2 px-3 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] capitalize transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-[#9295A9]">
            New to Bridge?{' '}
            <Link to="/signup" className="font-semibold text-[#00D5FF] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. SIGNUP PAGE
// ==========================================
export const SignupPage: React.FC = () => {
  const { signup, googleLogin } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'brand' ? 'brand' : 'creator';

  const [role, setRole] = useState<'creator' | 'brand'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }
    setLoading(true);
    try {
      const u = await signup({ fullName, email, password, role });
      navigate(routeAfterAuth(u));
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050509] text-[#F5F5FA]">
      <AuthLeftShowcase
        headline="MAKE YOUR NEXT MOVE."
        subtext="Step onto India’s intelligent collaboration bridge for emerging creators and brands."
      />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <Link
              to="/"
              className="inline-block font-display text-base font-bold tracking-[0.18em] text-[#00D5FF]"
            >
              BRIDGE
            </Link>
            <h1 className="font-display text-3xl font-bold text-[#F5F5FA]">
              MAKE YOUR NEXT MOVE.
            </h1>
            <p className="text-xs text-[#9295A9]">
              Choose how you want to participate on Bridge:
            </p>
          </div>

          {/* Interactive Role Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('creator')}
              className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer space-y-1.5 ${
                role === 'creator'
                  ? 'bg-[#171B2C] border-[#F000B8]'
                  : 'bg-[#101426] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold tracking-wider uppercase text-[#F000B8]">
                  CREATOR
                </span>
                <Sparkles className="w-4 h-4 text-[#F000B8]" />
              </div>
              <p className="text-xs text-[#F5F5FA] leading-snug">
                I want to collaborate with brands.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole('brand')}
              className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer space-y-1.5 ${
                role === 'brand'
                  ? 'bg-[#171B2C] border-[#00D5FF]'
                  : 'bg-[#101426] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold tracking-wider uppercase text-[#00D5FF]">
                  BRAND
                </span>
                <Briefcase className="w-4 h-4 text-[#00D5FF]" />
              </div>
              <p className="text-xs text-[#F5F5FA] leading-snug">
                I want to discover and work with creators.
              </p>
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 px-4 py-3 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="signup-name" className="text-xs font-medium text-[#F5F5FA]">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === 'creator' ? 'e.g. Kavya Menon' : 'e.g. Vikram Desai'}
                className="w-full px-4 py-2.5 rounded-lg bg-[#101426] border border-white/12 text-sm text-[#F5F5FA] focus:outline-none focus:border-[#246BFD]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="signup-email" className="text-xs font-medium text-[#F5F5FA]">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.in"
                className="w-full px-4 py-2.5 rounded-lg bg-[#101426] border border-white/12 text-sm text-[#F5F5FA] focus:outline-none focus:border-[#246BFD]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="signup-pw" className="text-xs font-medium text-[#F5F5FA]">
                  Password (8+ chars)
                </label>
                <input
                  id="signup-pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#101426] border border-white/12 text-sm text-[#F5F5FA] focus:outline-none focus:border-[#246BFD]"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="signup-confirm"
                  className="text-xs font-medium text-[#F5F5FA]"
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#101426] border border-white/12 text-sm text-[#F5F5FA] focus:outline-none focus:border-[#246BFD]"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[#9295A9] cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded accent-[#246BFD]"
              />
              <span>
                I agree to Bridge’s{' '}
                <Link to="/terms" className="text-[#00D5FF] hover:underline">
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#00D5FF] hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] font-display text-xs font-bold tracking-[0.14em] uppercase text-[#F5F5FA] cursor-pointer"
            >
              {loading ? 'Creating Account…' : `Continue as ${role}`}
            </button>
          </form>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const u = await googleLogin(role);
                navigate(routeAfterAuth(u));
              } finally {
                setLoading(false);
              }
            }}
            className="w-full py-2.5 rounded-lg bg-[#101426] hover:bg-[#171B2C] border border-white/15 text-xs font-semibold text-[#F5F5FA] cursor-pointer"
          >
            Sign up with Google (Local Auth Adapter)
          </button>

          <p className="text-center text-xs text-[#9295A9]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#00D5FF] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. FORGOT PASSWORD PAGE
// ==========================================
export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResultMsg('');
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.forgotPassword({
        email,
        newPassword: newPassword.length >= 8 ? newPassword : undefined,
      });
      setResultMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'Recovery failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050509] text-[#F5F5FA] p-6">
      <div className="max-w-md w-full rounded-2xl bg-[#101426] border border-white/10 p-8 space-y-6">
        <div className="space-y-2">
          <Link
            to="/login"
            className="text-xs font-semibold text-[#00D5FF] hover:underline"
          >
            ← Back to Login
          </Link>
          <h1 className="font-display text-2xl font-bold">Reset Your Password</h1>
          <p className="text-xs text-[#9295A9]">
            Enter your account email and optional new password (8+ chars) to reset inside
            the local authentication adapter.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 p-3 text-xs text-[#EF4444]">
            {error}
          </div>
        )}
        {resultMsg && (
          <div className="rounded-lg bg-[#34D399]/15 border border-[#34D399]/40 p-3 text-xs text-[#34D399]">
            {resultMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="fp-email" className="text-xs font-medium">
              Email Address
            </label>
            <input
              id="fp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="fp-new" className="text-xs font-medium">
              New Password (Optional instant reset for registered local accounts)
            </label>
            <input
              id="fp-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#246BFD] text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {loading ? 'Processing…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
