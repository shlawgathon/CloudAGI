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
        placeholder="Paste order ID"
        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/12 px-5 py-3 text-white outline-none transition focus:border-[var(--accent)]"
      />
      <button
        type="submit"
        className="accent-gradient rounded-full border border-[var(--accent)] px-5 py-3 font-semibold text-white shadow-[0_8px_22px_rgba(240,125,73,0.28)] transition hover:brightness-105"
      >
        View status
      </button>
    </form>
  );
}
