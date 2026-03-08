"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function resolveOrderSearchTarget(input: string, fallbackToken?: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const orderIndex = segments.findIndex((segment) => segment === "orders" || segment === "dashboard");
    const orderId = orderIndex >= 0 ? segments[orderIndex + 1] : "";
    if (!orderId) {
      return null;
    }

    const token = url.searchParams.get("token") || fallbackToken;
    return token
      ? `/orders/${orderId}?token=${encodeURIComponent(token)}`
      : `/orders/${orderId}`;
  } catch {
    const token = fallbackToken?.trim();
    return token
      ? `/orders/${trimmed}?token=${encodeURIComponent(token)}`
      : `/orders/${trimmed}`;
  }
}

export function StatusSearch({
  initialOrderId = "",
  initialToken
}: {
  initialOrderId?: string;
  initialToken?: string;
}) {
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

        const target = resolveOrderSearchTarget(trimmed, initialToken);
        if (!target) {
          return;
        }

        router.push(target);
      }}
    >
      <input
        value={orderId}
        onChange={(event) => setOrderId(event.target.value)}
        placeholder="Paste order ID or secure status link"
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
