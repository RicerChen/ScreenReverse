import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/tasks/store";
import { taskProcessor } from "@/lib/tasks/processor";
import { CreateTaskRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json();

    // 验证请求
    if (!body.url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // 验证 URL 格式
    try {
      const url = new URL(body.url);
      if (!url.protocol.startsWith("http")) {
        return NextResponse.json(
          { error: "Invalid URL protocol" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // 创建任务
    const taskId = taskStore.createTask(
      body.url,
      body.provider,
      body.apiKey,
      body.model
    );

    console.log(`[API] Task created: ${taskId} for URL: ${body.url} with provider: ${body.provider || "default"}`);

    // 异步处理任务（不等待完成）
    taskProcessor.processTask(taskId).catch((error) => {
      console.error(`[API] Error processing task ${taskId}:`, error);
    });

    // 返回任务 ID
    return NextResponse.json({ taskId }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
