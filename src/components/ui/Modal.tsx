"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      // z-[60] pour passer au-dessus de la bottom nav (z-50)
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg mx-0 sm:mx-4 animate-slide-up",
        "px-5 pt-5",
        // Mobile : on laisse de la place en bas pour passer au-dessus de la bottom nav (~72px) + safe area iOS
        "pb-[calc(1.25rem+env(safe-area-inset-bottom)+72px)] sm:pb-5",
        // Hauteur max : on évite que le modal touche la bottom nav
        "max-h-[calc(100dvh-80px)] sm:max-h-[90dvh] overflow-y-auto",
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="font-heading text-lg font-semibold">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
