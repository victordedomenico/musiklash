import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  return <input className={cn("input", className)} {...props} />;
}
