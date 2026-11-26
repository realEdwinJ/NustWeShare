"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; tone: Tone; action?: { label: string; onClick: () => void } };
type ToastFn = (t: Omit<Toast, "id" | "tone"> & { tone?: Tone; duration?: number }) => void;

const ToastCtx = createContext<{ toast: ToastFn }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback<ToastFn>(
    ({ duration = 4500, tone = "info", ...rest }) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, tone, ...rest }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-3.5 shadow-[var(--shadow-pop)] animate-slide-up"
              role={t.tone === "error" ? "alert" : "status"}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-destructive" : "text-info")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
                {t.action && (
                  <button
                    className="mt-1.5 text-sm font-medium text-info hover:underline"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded-md p-0.5 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
