"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MapPin, Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

function getGreetingKey(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export default function HeroSection() {
  const t = useTranslations("hero");
  const [greeting, setGreeting] = useState<
    "morning" | "afternoon" | "evening" | null
  >(null);

  useEffect(() => {
    setGreeting(getGreetingKey());
  }, []);

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-br from-espresso-dark via-espresso to-espresso-light pt-24 pb-16"
    >
      {/* SVG pattern overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#hero-dots)"
          className="text-white"
        />
      </svg>

      {/* Decorative blur circles */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-caramel opacity-10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 -right-32 w-80 h-80 bg-caramel opacity-10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-12 lg:gap-16">
          {/* Left column: text */}
          <div className="flex-1 py-8 sm:py-12">
            <p className="text-caramel-light text-lg font-medium mb-3 animate-fadeIn min-h-[28px]">
              {greeting ? t(greeting) : "\u00A0"}
            </p>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-bold leading-tight">
              {t("title")}
            </h1>

            <p className="text-white/70 text-lg lg:text-xl mt-4 max-w-lg leading-relaxed">
              {t("subtitle")}
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Button variant="caramel" icon={<MapPin size={18} />} href="#map">
                {t("findMachine")}
              </Button>
              <Button
                variant="outline"
                icon={<Coffee size={18} />}
                href="#menu"
                className="!border-white/30 !text-white hover:!bg-white/10"
              >
                {t("viewMenu")}
              </Button>
            </div>
          </div>

          {/* Right column: machine photo (desktop only) */}
          <div className="hidden lg:flex items-end justify-center flex-shrink-0">
            <Image
              src="/images/machines/coffee-machine-hero.webp"
              alt={t("machineImageAlt")}
              width={320}
              height={480}
              sizes="(min-width: 1024px) 320px"
              priority
              className="h-80 w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
