import { useState, useEffect } from "react";

export interface QueueItem {
  id: string;
  projectId: string;
  projectName: string;
  type: "text" | "image" | "video" | "compile";
  status: "pending" | "running" | "completed" | "failed";
  label: string;
  progress: number;
  error?: string;
  createdAt: string;
  run: () => Promise<any>;
}

class QueueManager {
  private listeners = new Set<() => void>();
  private queue: QueueItem[] = [];
  private limits = {
    text: 1,      // Gemini Text always sequential (concurrency 1)
    image: 1,     // Will be dynamically updated from system config
    video: 1,     // Will be dynamically updated from system config
    compile: 1,   // Sequential compilation
  };

  updateLimits(imageLimit: number, videoLimit: number) {
    this.limits.image = Math.max(1, imageLimit);
    this.limits.video = Math.max(1, videoLimit);
    this.processQueue();
  }

  getQueue() {
    return this.queue;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  enqueue(item: Omit<QueueItem, "status" | "progress" | "createdAt">) {
    // Check if item already exists in queue to avoid duplicates
    if (this.queue.some((i) => i.id === item.id)) {
      return;
    }

    const newItem: QueueItem = {
      ...item,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    this.queue.push(newItem);
    this.notify();
    this.processQueue();
  }

  updateProgress(id: string, progress: number) {
    const item = this.queue.find((i) => i.id === id);
    if (item) {
      item.progress = Math.min(100, Math.max(0, progress));
      this.notify();
    }
  }

  retry(id: string) {
    const item = this.queue.find((i) => i.id === id);
    if (item && item.status === "failed") {
      item.status = "pending";
      item.progress = 0;
      delete item.error;
      this.notify();
      this.processQueue();
    }
  }

  remove(id: string) {
    this.queue = this.queue.filter((i) => i.id !== id);
    this.notify();
    this.processQueue();
  }

  clearCompleted() {
    this.queue = this.queue.filter((i) => i.status !== "completed");
    this.notify();
  }

  clearAll() {
    this.queue = [];
    this.notify();
  }

  private async processQueue() {
    const types: QueueItem["type"][] = ["text", "image", "video", "compile"];

    types.forEach((type) => {
      const runningCount = this.queue.filter(
        (i) => i.type === type && i.status === "running"
      ).length;
      const limit = this.limits[type];

      if (runningCount < limit) {
        const slotsAvailable = limit - runningCount;
        const pendingItems = this.queue.filter(
          (i) => i.type === type && i.status === "pending"
        );

        pendingItems.slice(0, slotsAvailable).forEach((item) => {
          this.executeItem(item);
        });
      }
    });
  }

  private async executeItem(item: QueueItem) {
    item.status = "running";
    this.notify();

    try {
      await item.run();
      item.status = "completed";
      item.progress = 100;
    } catch (err: any) {
      item.status = "failed";
      item.error = err.message || "Lỗi không xác định";
    } finally {
      this.notify();
      this.processQueue();
    }
  }
}

export const queueStore = new QueueManager();

export const useQueueStore = () => {
  const [queue, setQueue] = useState(queueStore.getQueue());

  useEffect(() => {
    return queueStore.subscribe(() => {
      setQueue([...queueStore.getQueue()]);
    });
  }, []);

  return {
    queue,
    enqueue: (item: Omit<QueueItem, "status" | "progress" | "createdAt">) =>
      queueStore.enqueue(item),
    retry: (id: string) => queueStore.retry(id),
    remove: (id: string) => queueStore.remove(id),
    clearCompleted: () => queueStore.clearCompleted(),
    clearAll: () => queueStore.clearAll(),
    updateProgress: (id: string, progress: number) =>
      queueStore.updateProgress(id, progress),
    updateLimits: (imageLimit: number, videoLimit: number) =>
      queueStore.updateLimits(imageLimit, videoLimit),
  };
};
