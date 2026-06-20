import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Trash2, Calendar, Search, 
  BarChart2, Filter, AlertCircle, Coins, ArrowUpDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TokenUsageLog {
  id: string;
  projectId: string;
  projectName: string;
  model: string;
  timestamp: string; // ISO string
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface TokensTabProps {
  tokenLogs: TokenUsageLog[];
  setTokenLogs: React.Dispatch<React.SetStateAction<TokenUsageLog[]>>;
}

export const TokensTab: React.FC<TokensTabProps> = ({ tokenLogs = [], setTokenLogs }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | '7days' | '30days'
  const [sortField, setSortField] = useState<'timestamp' | 'cost' | 'inputTokens'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle single deletion
  const handleDeleteLog = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dòng nhật ký token này không?")) {
      const updated = tokenLogs.filter(log => log.id !== id);
      setTokenLogs(updated);
      localStorage.setItem("ai_token_usage_logs", JSON.stringify(updated));
    }
  };

  // Handle clear all
  const handleClearAllLogs = () => {
    if (window.confirm("CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ lịch sử token và chi phí lưu trữ trên thiết bị của bạn. Bạn có chắc muốn tiếp tục?")) {
      setTokenLogs([]);
      localStorage.setItem("ai_token_usage_logs", JSON.stringify([]));
    }
  };

  // Toggle sort order
  const handleSort = (field: 'timestamp' | 'cost' | 'inputTokens') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filters logic
  const filteredLogs = useMemo(() => {
    return tokenLogs.filter(log => {
      // 1. Search term (script name / model)
      const nameMatch = (log.projectName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const modelMatchStr = (log.model || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !nameMatch && !modelMatchStr) return false;

      // 2. Model Filter
      if (modelFilter !== "all" && log.model !== modelFilter) return false;

      // 3. Date Filter
      if (dateFilter !== "all") {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - logDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === "today") {
          // Check if same calendar day
          const today = new Date();
          if (logDate.getDate() !== today.getDate() || 
              logDate.getMonth() !== today.getMonth() || 
              logDate.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (dateFilter === "7days" && diffDays > 7) {
          return false;
        } else if (dateFilter === "30days" && diffDays > 30) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'timestamp') {
        return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * multiplier;
      }
      if (sortField === 'cost') {
        return (a.cost - b.cost) * multiplier;
      }
      if (sortField === 'inputTokens') {
        return ((a.inputTokens + a.outputTokens) - (b.inputTokens + b.outputTokens)) * multiplier;
      }
      return 0;
    });
  }, [tokenLogs, searchTerm, modelFilter, dateFilter, sortField, sortOrder]);

  // Aggregate Stats (based on filtered list for convenience, or total list)
  // Let's calculate total stats for the CURRENT filtered subset, but display both total or subset.
  // Actually, calculating stats for the FILTERED list makes the dashboard dynamic! Let's display stats for the filtered list.
  const stats = useMemo(() => {
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let runsCount = filteredLogs.length;

    filteredLogs.forEach(log => {
      totalInput += log.inputTokens || 0;
      totalOutput += log.outputTokens || 0;
      totalCost += log.cost || 0;
    });

    return {
      totalInput,
      totalOutput,
      totalCost,
      totalTokens: totalInput + totalOutput,
      runsCount,
      avgCost: runsCount > 0 ? totalCost / runsCount : 0
    };
  }, [filteredLogs]);

  // Project breakdown stats (top 5 scripts by cost)
  const scriptBreakdown = useMemo(() => {
    const map: Record<string, { name: string; cost: number; tokens: number }> = {};
    filteredLogs.forEach(log => {
      const key = log.projectId || "default";
      if (!map[key]) {
        map[key] = { name: log.projectName || "Kịch bản ẩn", cost: 0, tokens: 0 };
      }
      map[key].cost += log.cost || 0;
      map[key].tokens += (log.inputTokens || 0) + (log.outputTokens || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [filteredLogs]);

  // Model breakdown stats
  const modelBreakdown = useMemo(() => {
    const map: Record<string, { model: string; cost: number; runs: number }> = {};
    filteredLogs.forEach(log => {
      const key = log.model || "Unknown";
      if (!map[key]) {
        map[key] = { model: key, cost: 0, runs: 0 };
      }
      map[key].cost += log.cost || 0;
      map[key].runs += 1;
    });

    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [filteredLogs]);

  // Helper to format date
  const formatDateString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch (e) {
      return isoString;
    }
  };

  // Helper to get model badge styling
  const getModelBadge = (model: string) => {
    const m = model.toLowerCase();
    if (m.includes("pro")) {
      return "bg-violet-500/10 border-violet-500/20 text-violet-400";
    }
    if (m.includes("mini")) {
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    }
    if (m.includes("flash")) {
      return "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
    }
    return "bg-zinc-500/10 border-zinc-500/20 text-zinc-400";
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
            <Coins className="w-6 h-6 text-indigo-400 animate-pulse" />
            Quản Lý Token & Chi Phí AI
          </h1>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono uppercase tracking-wider">
            Thống kê chi tiết, kiểm soát ngân sách sử dụng API theo từng kịch bản
          </p>
        </div>

        {tokenLogs.length > 0 && (
          <button
            onClick={handleClearAllLogs}
            className="px-4 py-2 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/50 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa Toàn Bộ Nhật Ký
          </button>
        )}
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cost Card */}
        <div className="p-5 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 border border-emerald-500/20 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all" />
          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
            Tổng chi phí ước tính
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              ${stats.totalCost.toFixed(5)}
            </span>
            <span className="text-[10px] text-emerald-500/70 font-mono">USD</span>
          </div>
          <div className="mt-3 text-[9px] text-zinc-500 font-mono flex justify-between border-t border-white/5 pt-2">
            <span>AVG/KỊCH BẢN:</span>
            <span className="text-emerald-400 font-bold">${stats.avgCost.toFixed(5)}</span>
          </div>
        </div>

        {/* Total Tokens Card */}
        <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all" />
          <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
            Tổng Token tiêu thụ
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {stats.totalTokens.toLocaleString()}
            </span>
            <span className="text-[10px] text-indigo-500/70 font-mono">TOKENS</span>
          </div>
          <div className="mt-3 text-[9px] text-zinc-500 font-mono flex justify-between border-t border-white/5 pt-2">
            <span>INPUT / OUTPUT:</span>
            <span className="text-zinc-300 font-bold">
              {stats.totalInput.toLocaleString()} / {stats.totalOutput.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Runs Count Card */}
        <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all" />
          <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-bold">
            Số lượt gửi yêu cầu AI
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {stats.runsCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-violet-500/70 font-mono">LƯỢT CHẠY</span>
          </div>
          <div className="mt-3 text-[9px] text-zinc-500 font-mono flex justify-between border-t border-white/5 pt-2">
            <span>BỘ LỌC ĐANG CHỌN:</span>
            <span className="text-zinc-300 font-bold">
              {dateFilter === "all" ? "Tất cả" : dateFilter === "today" ? "Hôm nay" : `Gần ${dateFilter.replace("days", "")} ngày`}
            </span>
          </div>
        </div>

        {/* Cost Optimization Card */}
        <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all" />
          <div className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold">
            Hiệu quả kinh tế
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              Gemini 2.5 Flash
            </span>
          </div>
          <div className="mt-3 text-[9px] text-zinc-500 font-mono flex justify-between border-t border-white/5 pt-2">
            <span>GIÁ TRỊ TIẾT KIỆM:</span>
            <span className="text-emerald-400 font-bold">TỐI ƯU</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown */}
      {filteredLogs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Script Breakdown Bar Chart */}
          <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Phân bổ chi phí theo kịch bản (Top 5)
              </h3>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Tên kịch bản | Tổng chi phí (USD)</p>
            </div>
            <div className="space-y-3.5">
              {scriptBreakdown.map((item, idx) => {
                const percent = stats.totalCost > 0 ? (item.cost / stats.totalCost) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-300 font-semibold truncate max-w-[280px]">{item.name}</span>
                      <span className="text-indigo-400 font-bold">${item.cost.toFixed(5)} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                      <span>{item.tokens.toLocaleString()} tokens</span>
                    </div>
                  </div>
                );
              })}
              {scriptBreakdown.length === 0 && (
                <div className="text-center text-[10px] text-zinc-500 py-6">Không có dữ liệu kịch bản.</div>
              )}
            </div>
          </div>

          {/* Model Breakdown Chart */}
          <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Thống kê theo mô hình AI (Model Engine)
              </h3>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Loại mô hình | Số lần chạy | Chi phí</p>
            </div>
            <div className="space-y-3.5">
              {modelBreakdown.map((item, idx) => {
                const percent = stats.totalCost > 0 ? (item.cost / stats.totalCost) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-300 font-semibold">{item.model}</span>
                      <span className="text-emerald-400 font-bold">${item.cost.toFixed(5)} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                      <span>{item.runs} lần chạy</span>
                    </div>
                  </div>
                );
              })}
              {modelBreakdown.length === 0 && (
                <div className="text-center text-[10px] text-zinc-500 py-6">Không có dữ liệu mô hình.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Control bar */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên kịch bản, model..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          {/* Model Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-zinc-500" />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-zinc-300 font-bold uppercase tracking-wider outline-none cursor-pointer focus:border-indigo-500/50 transition-all"
            >
              <option style={{ backgroundColor: '#18181b' }} value="all">TẤT CẢ MODEL</option>
              <option style={{ backgroundColor: '#18181b' }} value="gemini-2.5-flash">GEMINI 2.5 FLASH</option>
              <option style={{ backgroundColor: '#18181b' }} value="gemini-2.5-pro">GEMINI 2.5 PRO</option>
              <option style={{ backgroundColor: '#18181b' }} value="gpt-4o-mini">GPT-4O MINI</option>
              <option style={{ backgroundColor: '#18181b' }} value="gpt-4o">GPT-4O</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-zinc-300 font-bold uppercase tracking-wider outline-none cursor-pointer focus:border-indigo-500/50 transition-all"
            >
              <option style={{ backgroundColor: '#18181b' }} value="all">TẤT CẢ THỜI GIAN</option>
              <option style={{ backgroundColor: '#18181b' }} value="today">HÔM NAY</option>
              <option style={{ backgroundColor: '#18181b' }} value="7days">7 NGÀY QUA</option>
              <option style={{ backgroundColor: '#18181b' }} value="30days">30 NGÀY QUA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detailed Logs List */}
      <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black/10 backdrop-blur-3xl">
        <div className="px-5 py-4 bg-white/[0.02] border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            Danh sách lịch sử tiêu thụ Token
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">
            Hiển thị {filteredLogs.length} / {tokenLogs.length} dòng
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono">
            <thead>
              <tr className="border-b border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-white/[0.01]">
                <th className="py-3.5 px-5">STT</th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition-all select-none"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-1.5">
                    Ngày tháng
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Kịch bản (Dự án)</th>
                <th className="py-3.5 px-4">Mô hình AI</th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition-all select-none text-right"
                  onClick={() => handleSort('inputTokens')}
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    Tổng Token
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition-all select-none text-right"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    Chi phí (USD)
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-5 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const totalTokens = (log.inputTokens || 0) + (log.outputTokens || 0);
                return (
                  <tr 
                    key={log.id} 
                    className="border-b border-white/5 text-[10px] text-zinc-300 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-5 text-zinc-500 font-bold">{index + 1}</td>
                    <td className="py-3.5 px-4 text-zinc-400">{formatDateString(log.timestamp)}</td>
                    <td className="py-3.5 px-4 font-semibold text-white max-w-[200px] truncate" title={log.projectName}>
                      {log.projectName || "Kịch bản ẩn"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn("px-2 py-0.5 rounded-full border text-[8px] font-bold tracking-wider uppercase", getModelBadge(log.model))}>
                        {log.model}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-zinc-200 font-bold">{totalTokens.toLocaleString()}</span>
                      <span className="text-[8px] text-zinc-500 block">
                        I: {log.inputTokens?.toLocaleString()} | O: {log.outputTokens?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                      ${log.cost.toFixed(5)}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 border border-white/10 hover:border-rose-500/40 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-lg cursor-pointer transition-all active:scale-90"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 px-5 text-center text-[11px] text-zinc-500">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-600 animate-bounce" />
                    Không tìm thấy lịch sử nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
