"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  Home,
  Mic,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "../lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/drill", label: "Drill", icon: Zap },
  { href: "/roleplay", label: "Roleplay", icon: Target },
  { href: "/coach", label: "Coach", icon: Mic },
  { href: "/field", label: "Field", icon: Users },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
];

export function Nav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-flame-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
