import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  glow?: "blue" | "purple" | "green";
}

export function Card({ className, gradient, glow, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-4",
        gradient && "bg-gradient-card",
        glow === "blue" && "shadow-glow-blue",
        glow === "purple" && "shadow-glow-purple",
        glow === "green" && "shadow-glow-green",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between mb-3", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-heading text-sm font-semibold uppercase tracking-wider text-foreground-muted", className)} {...props}>{children}</h3>;
}
