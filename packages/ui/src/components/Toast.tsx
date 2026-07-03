import * as RadixToast from "@radix-ui/react-toast";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext } from "./toast-context";

interface ToastEntry {
  id: number;
  message: string;
}

/**
 * Toast-lag: mørk pille nederst over fanebjælken (som i designoplægget).
 * Radix håndterer aria-live, swipe-to-dismiss og auto-luk.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((message: string) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), message }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider duration={2400} swipeDirection="down">
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) remove(toast.id);
            }}
            className={[
              "rounded-pill bg-ink px-5 py-3 text-small font-medium text-bg shadow-sheet",
              "motion-safe:data-[state=open]:animate-toast-in",
              "data-[state=closed]:opacity-0 transition-opacity",
            ].join(" ")}
          >
            <RadixToast.Description>{toast.message}</RadixToast.Description>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit max-w-[90vw] flex-col items-center gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
