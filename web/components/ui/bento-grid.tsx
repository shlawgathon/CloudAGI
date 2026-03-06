import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function BentoGrid({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 gap-4 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta
}: {
  name: string;
  className?: string;
  background: ReactNode;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      key={name}
      className={cn(
        "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,31,0.96),rgba(6,10,19,0.9))] shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:col-span-3",
        className
      )}
    >
      <div className="absolute inset-0">{background}</div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,18,0.02),rgba(3,8,18,0.94))]" />

      <div className="pointer-events-none relative z-10 flex h-full transform-gpu flex-col justify-between gap-4 p-6 transition-all duration-300 group-hover:-translate-y-2">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur">
            <Icon className="h-6 w-6 text-[var(--accent-soft)]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-white">{name}</h3>
            <p className="max-w-lg text-sm leading-7 text-white/70">{description}</p>
          </div>
        </div>

        <div className="translate-y-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="pointer-events-auto rounded-full border border-white/10 bg-white/[0.08] px-4 text-white hover:bg-white/[0.12]"
          >
            <a href={href}>
              {cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.03))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}

export { BentoCard, BentoGrid };
