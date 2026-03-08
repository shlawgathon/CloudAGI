import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const token = (await searchParams)?.token;

  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(101,255,225,0.10),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(255,178,115,0.10),transparent_24%)]" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
        <DashboardView orderId={id} readToken={token} />
      </div>
    </main>
  );
}
