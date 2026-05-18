import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-foreground-muted">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm",
            "placeholder:text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30",
            "transition-colors duration-200 min-h-[44px]",
            error && "border-accent-red focus:border-accent-red focus:ring-accent-red/30",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-accent-red">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
