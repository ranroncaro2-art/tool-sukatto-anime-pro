import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearLocalStorage = () => {
    if (window.confirm("Bạn có chắc chắn muốn reset toàn bộ cấu hình LocalStorage? Việc này có thể giải quyết các lỗi dữ liệu lỗi.")) {
      localStorage.clear();
      this.setState({ hasError: false, error: null, errorInfo: null });
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-full max-w-2xl bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-lg font-bold">
                ⚠️
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-wide text-red-400">Đã xảy ra lỗi hệ thống (React Crash)</h1>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Ứng dụng đã được ngăn chặn khỏi việc bị đóng băng hoàn toàn.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Chi tiết lỗi:</p>
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-xs text-red-400 overflow-auto max-h-48 whitespace-pre-wrap select-text">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-zinc-400 leading-relaxed">
              <strong>Lưu ý:</strong> Dữ liệu dự án của bạn vẫn an toàn trong database IndexedDB. Bạn có thể thử tải lại ứng dụng hoặc reset cấu hình LocalStorage để khắc phục.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleClearLocalStorage}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
              >
                Xóa Cấu Hình Tạm (Reset Cache)
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
              >
                Tải lại ứng dụng (Reload)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
