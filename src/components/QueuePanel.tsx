import React, { useState } from "react";
import { useQueueStore } from "../store/useQueueStore";
import { motion, AnimatePresence } from "motion/react";
import {
  X, RefreshCw, Trash2, Loader2, CheckCircle2,
  AlertCircle, Inbox, ListVideo, FileText, ImageIcon, Film, Play
} from "lucide-react";

export function QueuePanel() {
  const { queue, retry, remove, clearCompleted, clearAll } = useQueueStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "text" | "image" | "video" | "compile">("all");

  const runningCount = queue.filter(item => item.status === "running").length;
  const pendingCount = queue.filter(item => item.status === "pending").length;
  const failedCount = queue.filter(item => item.status === "failed").length;

  const filteredQueue = queue.filter(item => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Loader2 className="w-4 h-4 text-zinc-500 opacity-40" />; // pending
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "running":
        return "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
      case "completed":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
      case "failed":
        return "bg-rose-500/10 border-rose-500/20 text-rose-400";
      default:
        return "bg-zinc-800 border-zinc-700 text-zinc-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="w-3.5 h-3.5" />;
      case "image":
        return <ImageIcon className="w-3.5 h-3.5" />;
      case "video":
        return <Film className="w-3.5 h-3.5" />;
      case "compile":
        return <ListVideo className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg border border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all cursor-pointer flex items-center justify-center group active:scale-95"
      >
        <div className="relative">
          <ListVideo className={`w-6 h-6 ${runningCount > 0 ? "animate-pulse" : "group-hover:rotate-12 transition-transform"}`} />
          {(runningCount > 0 || pendingCount > 0 || failedCount > 0) && (
            <span className="absolute -top-3.5 -right-3.5 px-2 py-0.5 text-[9px] font-black rounded-full bg-rose-500 text-white border border-rose-400 shadow-md font-mono animate-bounce">
              {runningCount > 0 ? `${runningCount}/${queue.length}` : queue.length}
            </span>
          )}
        </div>
      </button>

      {/* Slide-over Queue Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sidebar Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[480px] bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 z-40 shadow-2xl flex flex-col min-h-0 select-none text-zinc-200"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-black uppercase tracking-wider text-sm text-white flex items-center gap-2">
                    <ListVideo className="w-5 h-5 text-indigo-400" /> Bể Hàng Chờ (Queue Pool)
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    Đang chạy: {runningCount} | Đang chờ: {pendingCount} | Lỗi: {failedCount}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5 bg-zinc-950 p-1 gap-1">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "text", label: "Văn bản" },
                  { id: "image", label: "Tạo Ảnh" },
                  { id: "video", label: "Tạo Video" },
                  { id: "compile", label: "Xuất Phim" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Actions toolbar */}
              {queue.length > 0 && (
                <div className="px-5 py-3 border-b border-white/5 bg-black/20 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                  <span>Tổng số tác vụ: {filteredQueue.length}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearCompleted}
                      className="hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa hoàn thành
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button
                      onClick={clearAll}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa hết
                    </button>
                  </div>
                </div>
              )}

              {/* Queue Items List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
                {filteredQueue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10 gap-3 opacity-40">
                    <Inbox className="w-12 h-12 text-zinc-600" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-mono font-bold">Hàng chờ trống</p>
                      <p className="text-[9px] text-zinc-500">Chưa có tác vụ nào đang xếp hàng tại đây.</p>
                    </div>
                  </div>
                ) : (
                  filteredQueue.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-black/30 border border-white/5 hover:border-white/10 rounded-xl space-y-2.5 transition-all relative group"
                    >
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-zinc-800 border border-white/5 rounded text-[8px] font-black font-mono tracking-wider text-zinc-400 uppercase">
                              {item.projectName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-bold text-indigo-400 flex items-center gap-1">
                              {getTypeIcon(item.type)}
                              {item.type.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-zinc-200 leading-relaxed truncate">
                            {item.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          <button
                            onClick={() => remove(item.id)}
                            className="p-1 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Xóa khỏi hàng chờ"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Error section */}
                      {item.status === "failed" && item.error && (
                        <div className="p-2 bg-rose-500/5 border border-rose-500/15 text-rose-400 rounded-lg text-[9px] font-mono leading-relaxed whitespace-pre-wrap break-all flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.error}</span>
                        </div>
                      )}

                      {/* Bottom Controls / Progress */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          {item.status === "running" ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-indigo-400 font-bold">
                                <span>Đang xử lý...</span>
                                <span>{item.progress}%</span>
                              </div>
                              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-zinc-500 font-mono">
                              Tạo lúc: {new Date(item.createdAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        {item.status === "failed" && (
                          <button
                            onClick={() => retry(item.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Thử lại
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
