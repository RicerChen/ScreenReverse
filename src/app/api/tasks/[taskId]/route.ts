import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/tasks/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const task = taskStore.getTask(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 返回任务信息
    return NextResponse.json({
      taskId: task.taskId,
      url: task.url,
      status: task.status,
      progress: task.progress,
      result: task.result || null,
      error: task.error || null,
    });
  } catch (error) {
    console.error("[API] Error getting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
