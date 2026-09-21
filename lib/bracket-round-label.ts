export function bracketRoundLabel(round: number, total: number, locale: "fr" | "en" = "fr") {
  const remaining = total - round + 1;
  if (locale === "en") {
    if (round === total) return "Final";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    if (remaining === 4) return "Round of 16";
    return `Round ${round}`;
  }
  if (round === total) return "Finale";
  if (remaining === 2) return "Demi-finale";
  if (remaining === 3) return "Quarts de finale";
  if (remaining === 4) return "Huitièmes de finale";
  return `Tour ${round}`;
}
