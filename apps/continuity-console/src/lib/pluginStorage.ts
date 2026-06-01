import type { PluginManifest } from "../types/continuity";

const storageKey = "ags-continuity-console.plugins";

export function readStoredPlugins(): PluginManifest[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue) as PluginManifest[];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function writeStoredPlugins(plugins: PluginManifest[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(plugins));
}
