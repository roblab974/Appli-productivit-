import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 pt-12 pb-4", className)}>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
