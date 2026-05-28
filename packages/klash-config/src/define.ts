import type { VerticalConfig } from "./types";

/** Identity helper giving authoring-time type checking + inference. */
export function defineVertical(config: VerticalConfig): VerticalConfig {
  if (config.gameModes.includes("battle-feat") && !config.relationGraph) {
    throw new Error(
      `[klash-config] Vertical "${config.slug}" enables "battle-feat" but has no relationGraph.`,
    );
  }
  if (!config.gameModes.includes("battle-feat") && config.relationGraph) {
    throw new Error(
      `[klash-config] Vertical "${config.slug}" defines relationGraph but battle-feat is disabled.`,
    );
  }
  return config;
}

/** Whether the current vertical exposes BattleFeat / BattleClash. */
export function isBattleFeatEnabled(config: VerticalConfig): boolean {
  return config.gameModes.includes("battle-feat") && !!config.relationGraph;
}
