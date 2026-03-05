"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coffee } from "lucide-react";
import { signIn, getSession } from "@/lib/admin-auth";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export default function AdminLoginPage() {
  const router = useRouter();
  const t = useTranslations("admin.login");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const attemptsRef = useRef<number[]>([]);

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push("/admin");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Rate limiting: max 5 attempts per 60 seconds
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter(
      (ts) => now - ts < WINDOW_MS,
    );
    if (attemptsRef.current.length >= MAX_ATTEMPTS) {
      setError(t("tooManyAttempts"));
      return;
    }
    attemptsRef.current.push(now);

    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/admin");
    } catch (err: unknown) {
      console.error("[auth]", err);
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-foam">
        <div className="text-espresso/50 text-sm">{tc("loading")}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-foam px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-espresso-dark rounded-2xl mb-4">
            <Coffee size={28} className="text-caramel" />
          </div>
          <h1 className="text-2xl font-bold text-espresso">VendHub Admin</h1>
          <p className="text-sm text-espresso/50 mt-1">{t("title")}</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md border border-espresso/5 p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-espresso/70 mb-1.5"
            >
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@vendhub.uz"
              className="w-full px-4 py-2.5 bg-foam border border-espresso/10 rounded-xl text-espresso placeholder-espresso/30 focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/30 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-espresso/70 mb-1.5"
            >
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-foam border border-espresso/10 rounded-xl text-espresso placeholder-espresso/30 focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/30 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-espresso to-espresso-light text-white font-medium rounded-xl px-6 py-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? t("logging") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
