import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { spring } from "../tokens";

/* ---------- AppShell ---------- */

export interface AppShellProps {
  children: ReactNode;
  /** Bundområdet — typisk <BottomTabBar>. */
  bottomBar?: ReactNode;
  className?: string;
}

/**
 * App-skal: scrollbart indhold med plads til den faste bundbjælke.
 * Positioneres relativt, så den også kan bruges indrammet (galleri/preview).
 */
export function AppShell({ children, bottomBar, className }: AppShellProps) {
  return (
    <div className={cn("relative flex h-full flex-col bg-bg", className)}>
      <div className="flex-1 overflow-y-auto pb-28">{children}</div>
      {bottomBar}
    </div>
  );
}

/* ---------- BottomTabBar ---------- */

export interface TabBarItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface BottomTabBarProps {
  items: TabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Midterslot til den hævede ScanFab. */
  center?: ReactNode;
  /** Oversat aria-label for navigationen. */
  navLabel: string;
}

export function BottomTabBar({
  items,
  activeId,
  onSelect,
  center,
  navLabel,
}: BottomTabBarProps) {
  const mid = Math.ceil(items.length / 2);
  const left = center ? items.slice(0, mid) : items;
  const right = center ? items.slice(mid) : [];

  const renderTab = (item: TabBarItem) => {
    const active = item.id === activeId;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1 text-caption font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          active ? "text-brand" : "text-tertiary hover:text-brand",
        )}
      >
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </button>
    );
  };

  // pb: mindst den gamle pb-5; på iPhone vinder home-indikatorens
  // safe-area-inset (fase 5.1 — env() kan ikke tokeniseres).
  return (
    <nav
      aria-label={navLabel}
      className="absolute inset-x-0 bottom-0 flex items-stretch border-t border-hairline bg-surface/85 px-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg"
    >
      {left.map(renderTab)}
      {center ? (
        <span className="relative flex flex-1 justify-center">{center}</span>
      ) : null}
      {right.map(renderTab)}
    </nav>
  );
}

/* ---------- ScanFab ---------- */

export interface ScanFabProps {
  onClick: () => void;
  /** Oversat aria-label, fx "Scan stregkode eller måltid". */
  label: string;
  icon: ReactNode;
}

export function ScanFab({ onClick, label, icon }: ScanFabProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={spring}
      className={cn(
        "absolute bottom-1.5 grid size-15 place-items-center rounded-pill btn-brand-surface text-on-brand shadow-fab",
        "transition-[filter] hover:brightness-105",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
      )}
    >
      <span aria-hidden="true">{icon}</span>
    </motion.button>
  );
}
