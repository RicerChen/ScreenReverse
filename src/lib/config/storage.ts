import { ProviderConfig } from "@/lib/types/config";

const CONFIG_STORAGE_KEY = "screenreverse_provider_config";

/**
 * 配置存储管理
 */
export class ConfigStorage {
  /**
   * 保存配置到 localStorage
   */
  static saveConfig(config: ProviderConfig): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("[ConfigStorage] Failed to save config:", error);
    }
  }

  /**
   * 从 localStorage 读取配置
   */
  static getConfig(): ProviderConfig | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ProviderConfig;
      }
    } catch (error) {
      console.error("[ConfigStorage] Failed to load config:", error);
    }
    return null;
  }

  /**
   * 清除配置
   */
  static clearConfig(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    } catch (error) {
      console.error("[ConfigStorage] Failed to clear config:", error);
    }
  }

  /**
   * 检查是否已配置
   */
  static isConfigured(): boolean {
    const config = this.getConfig();
    return config !== null && config.apiKey !== "";
  }
}
