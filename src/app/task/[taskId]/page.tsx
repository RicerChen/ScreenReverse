"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaskStatus, ReverseResult } from "@/lib/types";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [status, setStatus] = useState<TaskStatus>("queueing");
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<ReverseResult | null>(null);
  const [error, setError] = useState<string>("");
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  const [taskNotFound, setTaskNotFound] = useState<boolean>(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollTaskStatus = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);

        // 处理 404 - 任务不存在
        if (response.status === 404) {
          setTaskNotFound(true);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }

        if (!response.ok) {
          throw new Error("获取任务状态失败");
        }

        const data = await response.json();
        setStatus(data.status);
        setProgress(data.progress || "");
        setResult(data.result);
        setError(data.error || "");

        // 如果任务完成或失败，停止轮询
        if (data.status === "done" || data.status === "failed") {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err) {
        console.error("Error polling task status:", err);
        setError(err instanceof Error ? err.message : "获取任务状态失败");
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    // 立即执行一次
    pollTaskStatus();

    // 每 2 秒轮询一次
    intervalId = setInterval(pollTaskStatus, 2000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [taskId]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(index);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const getStatusText = () => {
    const statusMap: Record<TaskStatus, string> = {
      queueing: "排队中...",
      page_loading: "正在打开页面...",
      screenshotting: "正在截屏...",
      ocr: "正在提取文本...",
      analyzing: "正在逆向分析...",
      done: "完成",
      failed: "失败",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = () => {
    const colorMap: Record<TaskStatus, string> = {
      queueing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      page_loading: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      screenshotting: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      ocr: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      analyzing: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      done: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* 返回按钮 */}
          <button
            onClick={() => router.push("/")}
            className="mb-8 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            ← 返回首页
          </button>

          {/* 任务不存在提示 */}
          {taskNotFound && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                任务不存在
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                抱歉，找不到该任务。任务可能已过期（24小时后自动清理）或任务 ID 不正确。
              </p>
              <button
                onClick={() => router.push("/")}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded transition-colors"
              >
                返回首页创建新任务
              </button>
            </div>
          )}

          {/* 状态卡片 */}
          {!taskNotFound && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    任务状态
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    任务 ID: {taskId}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-full font-medium ${getStatusColor()}`}
                >
                  {getStatusText()}
                </div>
              </div>

              {progress && (
                <p className="mt-4 text-gray-600 dark:text-gray-300">{progress}</p>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* 结果展示 */}
          {!taskNotFound && result && status === "done" && (
            <div className="space-y-6">
              {/* 摘要卡片 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  📋 内容摘要
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      标题猜测:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {result.summary.title_guess}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      一句话总结:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {result.summary.one_sentence_summary}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        内容类型:
                      </span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {result.summary.content_type}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        目标受众:
                      </span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {result.summary.target_audience}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 结构拆解 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🏗️ 结构拆解
                </h3>
                <div className="space-y-3">
                  {result.structure.sections.map((section, index) => (
                    <div
                      key={index}
                      className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                    >
                      <h4 className="font-medium text-purple-900 dark:text-purple-300">
                        {section.name}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {section.description}
                      </p>
                    </div>
                  ))}
                  {result.structure.cta && result.structure.cta !== "无" && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h4 className="font-medium text-green-900 dark:text-green-300">
                        行动号召 (CTA)
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {result.structure.cta}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 写作套路 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  ✍️ 写作套路
                </h3>
                <ul className="space-y-2">
                  {result.writing_patterns.map((pattern, index) => (
                    <li
                      key={index}
                      className="flex items-start text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-purple-500 mr-2">•</span>
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prompt 套餐 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🎯 Prompt 套餐
                </h3>
                <div className="space-y-4">
                  {result.prompts.map((prompt, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div className="p-4 bg-gray-50 dark:bg-gray-700">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {prompt.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {prompt.description}
                        </p>
                      </div>
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                          {prompt.prompt_text}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(prompt.prompt_text, index)}
                          className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors"
                        >
                          {copiedPrompt === index ? "✓ 已复制" : "复制 Prompt"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 加载动画 */}
          {!taskNotFound && status !== "done" && status !== "failed" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">处理中，请稍候...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
