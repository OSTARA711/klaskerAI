import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface GradConfig {
  content: string;
  templates: string;
  static: string;
  output: string;
}

const defaultConfig: GradConfig = {
  content: "content",
  templates: "templates",
  static: "static",
  output: "public"
};

export function loadConfig(sitePath: string): GradConfig {
  const configPath = join(sitePath, "grad.config.json");

  if (!existsSync(configPath)) {
    console.warn(`grad.config.json not found at ${configPath}, using defaults.`);
    return defaultConfig;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (e) {
    console.warn(`Invalid grad.config.json, using defaults.`);
    return defaultConfig;
  }
}
