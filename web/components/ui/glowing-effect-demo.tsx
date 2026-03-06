"use client";

import type { ReactNode } from "react";
import { Bot, Cpu, Receipt, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function GlowingEffectDemo() {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-3 xl:max-h-[34rem] xl:grid-rows-2">
      <GridItem
        area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
        icon={<Receipt className="h-4 w-4" />}
        title="Agents can buy compute"
        description="Turn a budget ceiling into an explicit payment action instead of handing control back to ops."
      />
      <GridItem
        area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
        icon={<Bot className="h-4 w-4" />}
        title="Keep orchestration alive"
        description="Trinity can keep the workflow moving while a new order unlocks the next execution lane."
      />
      <GridItem
        area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
        icon={<Cpu className="h-4 w-4" />}
        title="Burst into GPU capacity"
        description="Paid expansion orders can route straight into Modal-backed compute when the agent needs more headroom."
      />
      <GridItem
        area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
        icon={<Sparkles className="h-4 w-4" />}
        title="Sell the idea fast"
        description="This effect works well for compact proof cards, launch sections, and product-story surfaces."
      />
      <GridItem
        area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
        icon={<Search className="h-4 w-4" />}
        title="Keep the proof inspectable"
        description="Status pages, logs, and artifacts can stay one click away even when the UI becomes more cinematic."
      />
    </ul>
  );
}

interface GridItemProps {
  area: string;
  icon: ReactNode;
  title: string;
  description: ReactNode;
}

function GridItem({ area, icon, title, description }: GridItemProps) {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          blur={2}
          spread={40}
          glow
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={4}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-border bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border-[0.75px] border-border bg-muted p-2">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="pt-0.5 font-sans text-xl leading-[1.375rem] font-semibold tracking-[-0.04em] text-balance text-foreground md:text-2xl md:leading-[1.875rem]">
                {title}
              </h3>
              <h2 className="font-sans text-sm leading-[1.125rem] text-muted-foreground md:text-base md:leading-[1.375rem] [&_b]:md:font-semibold [&_strong]:md:font-semibold">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
