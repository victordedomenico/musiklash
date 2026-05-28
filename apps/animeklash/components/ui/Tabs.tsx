import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}

export function TabLink({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      data-active={active}
      className={cn("btn-chip", className)}
    >
      {children}
    </span>
  );
}
