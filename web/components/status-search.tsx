"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StatusSearch({ initialOrderId = "" }: { initialOrderId?: string }) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-3 md:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = orderId.trim();
        if (!trimmed) {
          return;
        }

        router.push(`/orders/${trimmed}`);
      }}
    >
      <input
        value={orderId}
        onChange={(event) => setOrderId(event.target.value)}
        placeholder="Paste order ID or live demo run"
        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-white outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
      />
      <button
        type="submit"
        className="rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(18,30,47,0.98),rgba(10,17,29,0.98))] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[linear-gradient(180deg,rgba(24,38,58,0.98),rgba(12,21,35,0.98))]"
      >
        View status
      </button>
    </form>
  );
}
