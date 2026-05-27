"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, Moon, Briefcase, CheckSquare, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton, SignedIn } from "@clerk/nextjs";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "Accueil" },
  { href: "/workouts", icon: Dumbbell, label: "Sport" },
  { href: "/health", icon: Moon, label: "Santé" },
  { href: "/business", icon: Briefcase, label: "Business" },
  { href: "/finances", icon: Wallet, label: "Finances" },
  { href: "/todos", icon: CheckSquare, label: "Tâches" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Masque la bottom nav sur les pages d'authentification
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null;
  }

  return (
    <SignedIn>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass bottom-nav border-t border-border/50">
        <div className="flex items-center justify-around px-1 pt-2">
          {tabs.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[40px]",
                  active ? "text-accent-blue" : "text-foreground-muted hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-1 rounded-lg transition-all duration-200",
                  active && "bg-accent-blue/15"
                )}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={cn("text-[9px] font-medium tracking-wide", active ? "text-accent-blue" : "text-foreground-muted")}>
                  {label}
                </span>
              </Link>
            );
          })}
          {/* User button (avatar + menu profil/logout) */}
          <div className="flex flex-col items-center gap-0.5 px-1 py-1.5 min-w-[40px]">
            <UserButton
              appearance={{ elements: { avatarBox: "w-7 h-7" } }}
              afterSignOutUrl="/sign-in"
            />
            <span className="text-[9px] font-medium tracking-wide text-foreground-muted">Compte</span>
          </div>
        </div>
      </nav>
    </SignedIn>
  );
}
