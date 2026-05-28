import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement> & {
  media?: boolean;
};

export default function Card({ className, media = false, ...props }: Props) {
  return <div className={cn(media ? "group media-card" : "card", className)} {...props} />;
}
