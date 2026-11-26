import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
    });
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [location.pathname]);

  const dashboardHref =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'brand'
      ? '/brand'
      : '/creator';

  const navItems = [
    { label: 'Explore', to: '/explore' },
    { label: 'How it works', to: '/how-it-works' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#050509] text-[#F5F5FA]">
      {/* 3-Zone Top Bar Contract */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-200 ${
          scrolled || mobileOpen
            ? 'bg-[#050509]/95 border-b border-white/10'
            : 'bg-transparent border-b border-white/8'
        }`}
      >
        <div className="max-w-[1380px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-[0.18em] text-[#F5F5FA] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00D5FF]"
          >
            BRIDGE
          </Link>

          {/* Zone 2: 5 Concise Single-Line Nav Links with Animated Underline */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-8 text-sm text-[#9295A9]"
          >
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 group ${
                    active ? 'text-[#F5F5FA]' : 'hover:text-[#F5F5FA]'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute left-0 -bottom-0.5 h-[1.5px] bg-[#00D5FF] transition-transform duration-200 origin-left w-full ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action + Mobile Trigger */}
          <div className="flex items-center gap-4 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => navigate(dashboardHref)}
                className="px-4 py-2 rounded-lg bg-[#246BFD] hover:bg-[#1d5be0] text-xs font-semibold text-[#F5F5FA] whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer"
              >
                Open Workspace
              </button>
            ) : (
              <Link
                to="/signup"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#246BFD] hover:bg-[#1d5be0] text-xs font-semibold text-[#F5F5FA] whitespace-nowrap shrink-0 transition-colors duration-150"
              >
                Get Started
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-2 rounded-lg text-[#F5F5FA] hover:bg-[#101426]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-[#0B0D18] border-b border-white/10 px-6 py-6 space-y-4">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-base font-medium text-[#F5F5FA] py-1"
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/how-it-works?tab=creator" className="text-sm text-[#9295A9] py-1">
                For Creators
              </Link>
              <Link to="/how-it-works?tab=brand" className="text-sm text-[#9295A9] py-1">
                For Brands
              </Link>
              <Link to="/team" className="text-sm text-[#9295A9] py-1">
                Team BUILD4
              </Link>
              <Link to="/faq" className="text-sm text-[#9295A9] py-1">
                FAQ
              </Link>
            </div>
            <div className="pt-4 border-t border-white/10 flex items-center gap-3">
              {user ? (
                <Link
                  to={dashboardHref}
                  className="w-full text-center px-4 py-2.5 rounded-lg bg-[#246BFD] text-sm font-semibold text-[#F5F5FA]"
                >
                  Open Workspace
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex-1 text-center px-4 py-2.5 rounded-lg border border-white/15 text-sm font-medium text-[#F5F5FA]"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 text-center px-4 py-2.5 rounded-lg bg-[#246BFD] text-sm font-semibold text-[#F5F5FA]"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Editorial Quiet Footer */}
      <footer className="bg-[#0B0D18] border-t border-white/10 pt-16 pb-12">
        <div className="max-w-[1380px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/8">
            <div className="md:col-span-5 space-y-4">
              <Link
                to="/"
                className="font-display text-xl font-bold tracking-[0.18em] text-[#F5F5FA]"
              >
                BRIDGE
              </Link>
              <p className="text-sm text-[#9295A9] max-w-sm leading-relaxed">
                Your influence isn’t defined by your follower count. It’s defined by the
                connection you create. Built in India for emerging 10K–50K creators and
                forward-thinking brands.
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs text-[#9295A9]">
                <Link to="/login" className="text-[#00D5FF] hover:underline">
                  Log in to Workspace
                </Link>
                <span aria-hidden="true">·</span>
                <Link to="/signup" className="hover:text-[#F5F5FA]">
                  Create Account
                </Link>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-semibold text-[#F5F5FA] tracking-wider uppercase">
                Marketplace
              </h3>
              <ul className="space-y-2 text-sm text-[#9295A9]">
                <li>
                  <Link to="/explore" className="hover:text-[#F5F5FA] transition-colors">
                    Explore Campaigns
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works?tab=creator" className="hover:text-[#F5F5FA] transition-colors">
                    For Creators
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works?tab=brand" className="hover:text-[#F5F5FA] transition-colors">
                    For Brands
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-[#F5F5FA] transition-colors">
                    Deal Room Workflow
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-semibold text-[#F5F5FA] tracking-wider uppercase">
                Company
              </h3>
              <ul className="space-y-2 text-sm text-[#9295A9]">
                <li>
                  <Link to="/about" className="hover:text-[#F5F5FA] transition-colors">
                    About Bridge
                  </Link>
                </li>
                <li>
                  <Link to="/team" className="hover:text-[#F5F5FA] transition-colors">
                    Team BUILD4
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-[#F5F5FA] transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#F5F5FA] transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-semibold text-[#F5F5FA] tracking-wider uppercase">
                Legal & Trust
              </h3>
              <ul className="space-y-2 text-sm text-[#9295A9]">
                <li>
                  <Link to="/terms" className="hover:text-[#F5F5FA] transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-[#F5F5FA] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li className="text-xs text-[#9295A9]/80 pt-1">
                  INR (₹) Primary Settlement · Simulated Escrow in Demo Mode
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#9295A9]">
            <p>© 2026 BRIDGE by Team BUILD4. Crafted for creators & brands across India.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#F5F5FA] transition-colors"
              >
                Instagram
              </a>
              <span aria-hidden="true">·</span>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#F5F5FA] transition-colors"
              >
                YouTube
              </a>
              <span aria-hidden="true">·</span>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#F5F5FA] transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
