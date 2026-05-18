import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "blue" | "purple" | "green" | "amber" | "red" | "muted";
}

export default function Badge({ variant = "blue", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium",
        variant === "blue" && "bg-accent-blue/15 text-accent-blue",
        variant === "purple" && "bg-accent-purple/15 text-accent-purple",
        variant === "green" && "bg-accent-green/15 text-accent-green",
        variant === "amber" && "bg-accent-amber/15 text-accent-amber",
        variant === "red" && "bg-accent-red/15 text-accent-red",
        variant === "muted" && "bg-surface-2 text-foreground-muted",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
