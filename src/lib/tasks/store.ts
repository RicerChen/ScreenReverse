import { Task, TaskStatus } from "../types";

/**
 * 任务存储（内存存储，MVP 阶段）
 */
class TaskStore {
  private tasks: Map<string, Task> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 小时

  constructor() {
    // 启动定时清理任务
    this.startCleanup();
  }

  /**
   * 创建新任务
   */
  createTask(url: string, provider?: string, apiKey?: string, model?: string): string {
    const taskId = this.generateTaskId();
    const task: Task = {
      taskId,
      url,
      status: "queueing",
      createdAt: Date.now(),
      provider,
      apiKey,
      model,
    };

    this.tasks.set(taskId, task);
    return taskId;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    progress?: string
  ): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = status;
    if (progress) {
      task.progress = progress;
    }
    return true;
  }

  /**
   * 设置任务结果
   */
  setTaskResult(taskId: string, result: Task["result"]): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.result = result;
    task.status = "done";
    return true;
  }

  /**
   * 设置任务错误
   */
  setTaskError(taskId: string, error: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.error = error;
    task.status = "failed";
    return true;
  }

  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 启动定时清理过期任务
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [taskId, task] of this.tasks.entries()) {
        if (now - task.createdAt > this.TTL) {
          this.tasks.delete(taskId);
          console.log(`[TaskStore] Cleaned up expired task: ${taskId}`);
        }
      }
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 停止清理（用于测试）
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取所有任务（用于调试）
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}

// 导出单例
export const taskStore = new TaskStore();
