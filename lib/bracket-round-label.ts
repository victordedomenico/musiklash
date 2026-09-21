export function bracketRoundLabel(round: number, total: number) {
  const remaining = total - round + 1;
  if (round === total) return "Finale";
  if (remaining === 2) return "Demi-finale";
  if (remaining === 3) return "Quarts de finale";
  if (remaining === 4) return "Huitièmes de finale";
  return `Tour ${round}`;
}
