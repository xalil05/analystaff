"use client";

// ─── Barre d'action IA ───────────────────────────────────────────────────────────
import { Brain, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { useState } from "react";

type AiActionStatus = "idle" | "loading" | "done" | "error";

type AiActionsRowProps = {
  onAction: (key: string) => void;
  actions: Array<{
    key: string;
    label: string;
    description: string;
    icon: React.ElementType;
    example: string;
    permission: string;
  }>;
  loadingActions: Record<string, AiActionStatus>;
};

export function AiActionsRow({ onAction, actions, loadingActions }: AiActionsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        const status = loadingActions[action.key] ?? "idle";
        const isLoading = status === "loading";
        const isDone = status === "done";
        const isError = status === "error";

        return (
          <button
            key={action.key}
            onClick={() => onAction(action.key)}
            disabled={isLoading}
            className={`
              flex items-start gap-3 p-4 rounded-lg border text-left transition-[color,background-color,border-color,box-shadow,opacity]
              ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:shadow-sm cursor-pointer"}
              ${isDone ? "border-primary bg-primary-soft" : isError ? "border-destructive bg-destructive-soft" : "border-border bg-surface"}
            `}
          >
            <span
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${isDone ? "bg-primary text-on-primary" : isError ? "bg-destructive text-surface" : "bg-primary-soft text-primary-dark"}
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-data font-semibold text-sm text-text-strong">{action.label}</span>
                {isDone && (
                  <span className="badge badge-fit text-tiny">Fait</span>
                )}
                {isError && (
                  <span className="badge badge-injured text-tiny">Erreur</span>
                )}
              </div>
              <p className="text-xs text-muted mt-1">{action.description}</p>
              {action.example && (
                <pre className="mt-2 text-xs font-mono text-faint bg-surface-2 p-2 rounded overflow-x-auto">
                  {action.example}
                </pre>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
