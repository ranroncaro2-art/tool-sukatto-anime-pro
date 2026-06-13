import React, { useState, useEffect } from "react";
import { Mail, Key, Copy, Check, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (username: string, deployLink: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [macAddress, setMacAddress] = useState("00:00:00:00:00:00");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const fetchMac = async () => {
      const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
      if (isElectron) {
        try {
          const mac = await (window as any).electronAPI.getMacAddress();
          if (mac) {
            setMacAddress(mac);
          }
        } catch (err) {
          console.error("Failed to get MAC address:", err);
        }
      }
    };
    fetchMac();
  }, []);

  const handleCopyMac = () => {
    navigator.clipboard.writeText(macAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      triggerError("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzEC1f4NUh-7EP2C8MP4-yFEOrWsACseXyL7qUG6c3NgJ-Ol5XWhVrjGWo2kDbyrMY/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
            mac: macAddress,
          }),
          redirect: "follow",
        }
      );

      if (!response.ok) {
        throw new Error(`Xác thực thất bại (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...");
        
        // Save session locally
        localStorage.setItem("login_session_active", "true");
        localStorage.setItem("login_saved_username", username.trim());
        localStorage.setItem("login_deploy_link", data.deploy_link || "");

        setTimeout(() => {
          onLoginSuccess(username.trim(), data.deploy_link || "");
        }, 1200);
      } else {
        triggerError(data.message || "Tài khoản, mật khẩu hoặc thiết bị không hợp lệ!");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      triggerError("Lỗi kết nối máy chủ xác thực. Vui lòng kiểm tra mạng!");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] relative overflow-hidden font-sans p-4 animate-fadeIn">
      {/* Inline styles for keyframe animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      {/* Decorative neon blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Glassmorphism Card */}
      <div 
        className={`bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/80 max-w-md w-full relative z-10 transition-all duration-300 ${
          shake ? "animate-shake border-rose-500/50" : ""
        }`}
      >
        {/* Brand Logo & Title */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">XÁC THỰC THIẾT BỊ</h1>
            <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-widest">Sukatto Anime Pro v2.0.0</p>
          </div>
        </div>

        {/* Status Messages Banner */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <Check className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Username / Gmail Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest pl-1">Tài Khoản / Gmail</label>
            <div className="relative flex items-center">
              <Mail className="w-4.5 h-4.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="example@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-zinc-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans placeholder-zinc-600"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest pl-1">Mật khẩu</label>
            <div className="relative flex items-center">
              <Key className="w-4.5 h-4.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-11 py-3 bg-zinc-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans placeholder-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* MAC Address Box */}
          <div className="flex flex-col gap-1.5 bg-black/30 border border-white/5 p-3.5 rounded-xl mt-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Địa chỉ thiết bị (MAC):</span>
              {copied && <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase animate-fadeIn">Đã copy!</span>}
            </div>
            <div className="flex items-center justify-between gap-3 mt-1.5 select-all">
              <span className="text-xs font-mono font-semibold text-zinc-300 tracking-wider bg-zinc-950/60 px-3 py-1.5 rounded-lg border border-white/[0.03] flex-1 select-all">{macAddress}</span>
              <button
                type="button"
                onClick={handleCopyMac}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  copied 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95"
                }`}
                title="Sao chép địa chỉ MAC"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold uppercase tracking-widest rounded-xl text-[10px] shadow-lg shadow-indigo-600/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang Xác Thực...</span>
              </>
            ) : (
              <span>Đăng Nhập Ngay</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-[8px] font-mono text-zinc-600 text-center mt-8 tracking-widest uppercase">
          Thiết bị này sẽ được tự động liên kết với tài khoản sau khi đăng nhập lần đầu.
        </p>
      </div>
    </div>
  );
};
