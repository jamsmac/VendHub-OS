"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Menu, X, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { NAV_KEYS } from "@/lib/navigation";

export default function Header() {
  const nav = useTranslations("nav");
  const header = useTranslations("header");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#home");
  const headerRef = useRef<HTMLElement>(null);
  const isMobileMenuOpenRef = useRef(isMobileMenuOpen);
  isMobileMenuOpenRef.current = isMobileMenuOpen;
  const { showToast } = useToast();

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (isMobileMenuOpenRef.current) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track active section with IntersectionObserver
  useEffect(() => {
    const sectionIds = NAV_KEYS.map((item) => item.href.replace("#", ""));
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(`#${id}`);
            }
          });
        },
        { rootMargin: "-20% 0px -70% 0px" },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleNavClick = useCallback((href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  }, []);

  const handleLoginClick = useCallback(() => {
    showToast(header("mobileAppSoon"), "info");
    setIsMobileMenuOpen(false);
  }, [showToast, header]);

  return (
    <header
      ref={headerRef}
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-espresso-dark/95 backdrop-blur-lg shadow-xl"
          : "bg-espresso-dark",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#home");
            }}
            className="flex items-center gap-2.5"
          >
            <Image
              src="/images/brand/hub-logo.webp"
              alt="VendHub logo"
              width={40}
              height={40}
              sizes="40px"
              priority
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <span className="text-white font-body font-bold text-xl block leading-tight">
                VendHub
              </span>
              <span className="text-cream/60 text-xs block leading-tight">
                {header("brandTagline")}
              </span>
            </div>
          </a>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_KEYS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                aria-current={activeSection === item.href ? "page" : undefined}
                className={[
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                  activeSection === item.href
                    ? "bg-white/10 text-caramel"
                    : "text-white/60 hover:text-white",
                ].join(" ")}
              >
                {nav(item.key)}
              </a>
            ))}
          </nav>

          {/* Right: Language + Login + Mobile burger */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <button
              type="button"
              onClick={handleLoginClick}
              className="btn-caramel hidden sm:inline-flex items-center gap-1.5 !px-4 !py-2 text-sm"
            >
              {nav("login")}
              <ChevronRight size={16} />
            </button>

            {/* Mobile burger */}
            <button
              type="button"
              className="lg:hidden text-white/80 hover:text-white p-1.5 transition-colors"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={
                isMobileMenuOpen ? header("closeMenu") : header("openMenu")
              }
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden animate-expand bg-espresso-dark/95 backdrop-blur-lg border-t border-white/10"
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_KEYS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                aria-current={activeSection === item.href ? "page" : undefined}
                className={[
                  "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeSection === item.href
                    ? "bg-white/10 text-caramel"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                ].join(" ")}
              >
                {nav(item.key)}
              </a>
            ))}
            <div className="flex items-center justify-between mt-2 gap-3">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={handleLoginClick}
                className="btn-caramel flex-1 flex items-center justify-center gap-1.5 text-sm"
              >
                {nav("login")}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
