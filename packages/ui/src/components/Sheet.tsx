import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { durations } from "../tokens";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Oversat titel til skærmlæsere (kan skjules visuelt). */
  title: string;
  /** Vis titlen visuelt øverst i arket. */
  showTitle?: boolean;
  children: ReactNode;
  className?: string;
}

/** Spring-præset til ark-indglidning (§3.5: scan-arket kommer op med spring-fysik). */
const sheetSpring = { type: "spring", stiffness: 300, damping: 32 } as const;

export function Sheet({
  open,
  onOpenChange,
  title,
  showTitle = false,
  children,
  className,
}: SheetProps) {
  const reduceMotion = useReducedMotion();

  /* Radix' fokus-gendannelse afbrydes af AnimatePresence-forsinket unmount —
     gendan derfor selv fokus til åbneren, når exit-animationen er færdig. */
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence onExitComplete={() => openerRef.current?.focus()}>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: durations.base / 1000 }}
                className="fixed inset-0 z-40 bg-ink/40"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 1, y: "100%" }
                }
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={
                  reduceMotion ? { opacity: 0 } : { opacity: 1, y: "100%" }
                }
                transition={
                  reduceMotion
                    ? { duration: durations.fast / 1000 }
                    : sheetSpring
                }
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[86vh] max-w-lg overflow-y-auto",
                  "rounded-t-xl bg-surface-raised px-5 pb-8 pt-2 shadow-sheet",
                  "focus:outline-none",
                  className,
                )}
              >
                <div
                  className="mx-auto mb-4 mt-1 h-1 w-9 rounded-pill bg-hairline"
                  aria-hidden="true"
                />
                <Dialog.Title
                  className={
                    showTitle ? "mb-4 text-h2 text-ink" : "sr-only"
                  }
                >
                  {title}
                </Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
