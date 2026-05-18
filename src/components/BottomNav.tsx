"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, Moon, Briefcase, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/health", icon: Moon, label: "Santé" },
  { href: "/business", icon: Briefcase, label: "Business" },
  { href: "/todos", icon: CheckSquare, label: "Todos" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass bottom-nav border-t border-border/50">
      <div className="flex items-center justify-around px-2 pt-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]",
                active
                  ? "text-accent-blue"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                active && "bg-accent-blue/15"
              )}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn("text-[10px] font-medium tracking-wide", active ? "text-accent-blue" : "text-foreground-muted")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
