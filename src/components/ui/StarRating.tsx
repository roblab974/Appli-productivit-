"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  size?: number;
}

export default function StarRating({ value, max = 5, onChange, size = 20 }: StarRatingProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Évaluation">
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={cn("transition-colors cursor-pointer", onChange ? "hover:scale-110 active:scale-95" : "cursor-default")}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          style={{ transition: "transform 0.15s" }}
        >
          <Star
            size={size}
            className={cn(star <= value ? "text-accent-amber fill-accent-amber" : "text-muted")}
          />
        </button>
      ))}
    </div>
  );
}
