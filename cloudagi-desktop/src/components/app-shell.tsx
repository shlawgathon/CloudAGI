import type { ReactNode } from "react";
import type { CreditBalance, AppView } from "../types";
import { SideNav } from "./side-nav";

interface AppShellProps {
  providers: CreditBalance[];
  selectedId: string | null;
  view: AppView;
  onSelectProvider: (id: string) => void;
  onSelectView: (view: AppView) => void;
  children: ReactNode;
  footer: ReactNode;
}

export function AppShell({
  providers,
  selectedId,
  view,
  onSelectProvider,
  onSelectView,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Side navigation */}
      <SideNav
        providers={providers}
        selectedId={selectedId}
        view={view}
        onSelectProvider={onSelectProvider}
        onSelectView={onSelectView}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Footer / Task input */}
        {footer}
      </div>
    </div>
  );
}
