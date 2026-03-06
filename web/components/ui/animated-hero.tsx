"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const defaultTitles = ["compute", "runtime", "GPU bursts", "new lanes"];

interface AnimatedHeroProps {
  titlePrefix?: string;
  titleSuffix?: string;
  rotatingWords?: string[];
  description?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  className?: string;
}

export function AnimatedHero({
  titlePrefix = "Let AI agents buy",
  titleSuffix = "without waiting for ops.",
  rotatingWords = defaultTitles,
  description = "CloudAGI turns payments into execution. When an agent hits a ceiling, it can expand budget, unlock new compute, and continue the run through Nevermined, Trinity, and Modal.",
  primaryCtaHref = "/generate",
  primaryCtaLabel = "Generate expansion order",
  secondaryCtaHref = "/generate#agent-endpoint",
  secondaryCtaLabel = "Use the agent endpoint",
  className
}: AnimatedHeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => (rotatingWords.length > 0 ? rotatingWords : defaultTitles),
    [rotatingWords]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTitleNumber((current) => (current + 1) % titles.length);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className={cn("w-full", className)}>
      

      <div className="mt-6 flex flex-col gap-5">
        <h1 className="max-w-4xl font-[var(--font-display)] text-4xl leading-[0.98] text-white sm:text-5xl lg:text-[4.4rem]">
          <span className="block">{titlePrefix}</span>
          <span className="relative mt-3 flex min-h-[1.2em] items-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={titles[titleNumber]}
                className="inline-block bg-[linear-gradient(135deg,#ffffff_0%,#7ef7da_38%,#ffd39f_100%)] bg-clip-text pr-4 text-transparent"
                initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -36, filter: "blur(8px)" }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                {titles[titleNumber]}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="block">{titleSuffix}</span>
        </h1>

        <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          {description}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          asChild
          className="rounded-full px-5 text-sm shadow-[0_18px_50px_rgba(0,243,255,0.18)]"
        >
          <a href={primaryCtaHref}>
            {primaryCtaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-full border-white/15 bg-white/5 px-5 text-sm text-white hover:bg-white/10"
        >
          <a href={secondaryCtaHref}>{secondaryCtaLabel}</a>
        </Button>
      </div>
    </div>
  );
}
