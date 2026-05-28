import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "chip";
type Size = "md" | "xs";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  className,
  variant = "ghost",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "chip" && "btn-chip",
        size === "xs" && "btn-xs",
        className,
      )}
      {...props}
    />
  );
}
