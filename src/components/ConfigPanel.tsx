"use client";

import { useState, useEffect } from "react";
import { ConfigStorage } from "@/lib/config/storage";
import { PROVIDERS, LLMProvider, ProviderInfo } from "@/lib/types/config";

interface ConfigPanelProps {
  onConfigChange?: (config: { provider: LLMProvider; apiKey: string; model?: string }) => void;
}

export default function ConfigPanel({ onConfigChange }: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("zhipu");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    const config = ConfigStorage.getConfig();
    if (config) {
      setSelectedProvider(config.provider);
      setApiKey(config.apiKey);
      setModel(config.model || "");
      setHasConfig(config.apiKey !== "");
    }
  }, []);

  // 获取当前提供商信息
  const getCurrentProvider = (): ProviderInfo => {
    return PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];
  };

  // 保存配置
  const handleSave = () => {
    const config = {
      provider: selectedProvider,
      apiKey,
      model: model || undefined,
    };

    ConfigStorage.saveConfig(config);
    setIsSaved(true);
    setHasConfig(true);
    setTimeout(() => setIsSaved(false), 2000);

    // 通知父组件配置已更改
    if (onConfigChange) {
      onConfigChange(config);
    }
  };

  // 清除配置
  const handleClear = () => {
    setApiKey("");
    setModel("");
    ConfigStorage.clearConfig();
    setIsSaved(true);
    setHasConfig(false);
    setTimeout(() => setIsSaved(false), 2000);

    // 通知父组件配置已清除
    if (onConfigChange) {
      onConfigChange({ provider: selectedProvider, apiKey: "", model: undefined });
    }
  };

  const currentProvider = getCurrentProvider();

  return (
    <>
      {/* 配置按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all ${
          hasConfig
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-gray-600 hover:bg-gray-700 text-white"
        }`}
      >
        {hasConfig ? "✓ 已配置" : "⚙️ 配置 API"}
      </button>

      {/* 配置面板 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 标题 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  API 配置
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                配置你的 LLM 提供商 API Key
              </p>
            </div>

            {/* 配置表单 */}
            <div className="p-6 space-y-6">
              {/* 提供商选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  提供商
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        if (provider.available) {
                          setSelectedProvider(provider.id);
                          if (provider.defaultModel) {
                            setModel(provider.defaultModel);
                          }
                        }
                      }}
                      disabled={!provider.available}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedProvider === provider.id
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      } ${
                        !provider.available
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {provider.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {provider.description}
                          </p>
                        </div>
                        {!provider.available && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            即将推出
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`输入你的 ${currentProvider.name} API Key`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  你的 API Key 仅用于本次任务，不会被存储到服务器
                </p>
              </div>

              {/* 模型选择（可选） */}
              {selectedProvider === "zhipu" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型（可选）
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="glm-4-flash">glm-4-flash（推荐，速度快）</option>
                    <option value="glm-4">glm-4</option>
                    <option value="glm-4-plus">glm-4-plus</option>
                    <option value="glm-4.7-allTools">glm-4.7-allTools（最新，工具调用）</option>
                    <option value="glm-4.7-flash">glm-4.7-flash（最新，速度快）</option>
                    <option value="glm-4.7">glm-4.7（最新）</option>
                    <option value="glm-4.7-plus">glm-4.7-plus（最新 Plus）</option>
                  </select>
                </div>
              )}

              {/* 状态提示 */}
              {isSaved && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ 配置已保存
                  </p>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleSave}
                disabled={!apiKey}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  apiKey
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                保存配置
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                清除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
