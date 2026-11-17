import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  UserPlus,
} from 'lucide-react';
import type { AdminTabId, AuthPreviewData, UserProfile } from '../types/logistics';
import { BrandLogo } from './BrandLogo';
import { getInitials } from './ProfileScreen';

interface AuthPortalProps {
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: {
    fullName: string;
    email: string;
    password: string;
    defaultWarehouseCode: UserProfile['defaultWarehouseCode'];
    defaultRole: AdminTabId;
  }) => Promise<void>;
}

const DEMO_ACCOUNTS = [
  {
    name: 'Nguyễn Minh Anh',
    roleLabel: 'Admin Kho Tổng · TB-01',
    email: 'admin@sovereignsupply.vn',
    pass: 'admin123',
    initials: 'MA',
  },
  {
    name: 'Trần Quốc Bảo',
    roleLabel: 'Điều phối · BD-02',
    email: 'dieuphoi@sovereignsupply.vn',
    pass: 'admin123',
    initials: 'QB',
  },
];

const WORKFLOW_STEPS = [
  {
    id: 'fefo',
    title: '01. Kiểm lô FEFO',
    icon: Package,
    summary: 'Tự động xếp ưu tiên lô có hạn sử dụng sớm nhất, tính khả dụng Đủ ĐK - Giữ theo thời gian thực.',
  },
  {
    id: 'approve',
    title: '02. Giữ & Phê duyệt',
    icon: ShieldCheck,
    summary: 'Phát hiện thiếu tồn, đề xuất mua bù hoặc trình Admin phê duyệt tách giao ngay trên Tổng quan.',
  },
  {
    id: 'dispatch',
    title: '03. Điều phối POD',
    icon: Truck,
    summary: 'Theo dõi chặng SOẠN → TB-01 → GIAO → POD kèm phiếu mã vạch Code-128 & QR xuất kho.',
  },
];

export function AuthPortal({ onLogin, onRegister }: AuthPortalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [preview, setPreview] = useState<AuthPreviewData | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  // Login state
  const [loginEmail, setLoginEmail] = useState('admin@sovereignsupply.vn');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regWarehouse, setRegWarehouse] = useState<UserProfile['defaultWarehouseCode']>('TB-01');
  const [regDefaultTab, setRegDefaultTab] = useState<AdminTabId>('overview');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/preview')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthPreviewData | null) => {
        if (active && data) setPreview(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onLogin({ email: loginEmail, password: loginPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickDemoLogin = async (email: string, password: string) => {
    setError(null);
    setLoginEmail(email);
    setLoginPassword(password);
    setBusy(true);
    try {
      await onLogin({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập nhanh thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onRegister({
        fullName,
        email: regEmail,
        password: regPassword,
        defaultWarehouseCode: regWarehouse,
        defaultRole: regDefaultTab,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản.');
    } finally {
      setBusy(false);
    }
  };

  const liveInitials = getInitials(fullName || 'Admin Mới');
  const activeStep = WORKFLOW_STEPS[activeStepIdx] ?? WORKFLOW_STEPS[0];

  return (
    <div className="min-h-screen w-full bg-[#FAF6F2] text-[#3D040E] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-10">
      {/* Warm Liquid Glass Ambient Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-24 -left-16 w-96 h-96 rounded-full bg-[#F3D9DE]/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-24 -right-12 w-[28rem] h-[28rem] rounded-full bg-[#F7E7CE]/70 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1120px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative z-10"
      >
        {/* Left Column: Frosted Liquid Glass Auth Form */}
        <section className="lg:col-span-6 liquid-glass-dock rounded-[28px] p-5 sm:p-7 flex flex-col justify-between">
          <div>
            {/* Brand Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" />
                <div>
                  <h1 className="font-serif text-[22px] font-semibold text-[#3D040E] leading-none tracking-[-0.02em]">
                    Sovereign Admin
                  </h1>
                  <p className="text-[11.5px] text-[#6E5B5D] mt-1">
                    Cổng quản trị chuỗi cung ứng &amp; kho FEFO
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#640D22]">
                <Lock className="w-3.5 h-3.5" />
                <span>Phiên bảo mật</span>
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="mt-5 p-1 rounded-2xl bg-[#EFE6DC]/85 border border-[#FFFFFF]/80 grid grid-cols-2 gap-1">
              {[
                { id: 'login' as const, label: 'Đăng nhập', icon: KeyRound },
                { id: 'register' as const, label: 'Tạo tài khoản', icon: UserPlus },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setMode(tab.id);
                      setError(null);
                    }}
                    className={`relative h-10 rounded-xl text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      active ? 'text-[#FFFFFF]' : 'text-[#5C4B4C] hover:text-[#3D040E]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="auth-mode-pill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="liquid-glass-role-pill absolute inset-0 rounded-xl"
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-xl bg-[#FFF0F2] border border-[#F5C6CE] text-[#991B1B] text-[12px] font-medium"
              >
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="form-login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleLoginSubmit}
                  className="mt-5 space-y-3.5"
                >
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-[11.5px] font-semibold text-[#5C4B4C] mb-1"
                    >
                      Email công việc
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#7D6C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@sovereignsupply.vn"
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[13px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-[11.5px] font-semibold text-[#5C4B4C] mb-1"
                    >
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7D6C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="w-full h-11 pl-9 pr-10 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[13px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#7D6C6E] hover:text-[#3D040E] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-[#640D22] hover:bg-[#540316] text-[#FFFFFF] text-[13px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[0_6px_18px_rgba(100,13,34,0.24)]"
                  >
                    <span>{busy ? 'Đang xác thực...' : 'Đăng nhập vào Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  {/* 1-Tap Quick Demo Sign-In */}
                  <div className="pt-3 border-t border-[#E5DBD0]/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#6E5B5D]">
                      <span className="font-semibold inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#640D22]" />
                        Đăng nhập nhanh 1 chạm (Mật khẩu: admin123)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <motion.button
                          key={acc.email}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          disabled={busy}
                          onClick={() => handleQuickDemoLogin(acc.email, acc.pass)}
                          className="p-2.5 rounded-xl bg-[#FFFFFF]/85 hover:bg-[#FFFFFF] border border-[#E5DBD0] text-left flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="w-8 h-8 rounded-full bg-[#640D22] text-[#F7E5B4] font-serif text-[11px] font-semibold flex items-center justify-center shrink-0">
                            {acc.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12px] font-bold text-[#3D040E] truncate">
                              {acc.name}
                            </div>
                            <div className="text-[10.5px] text-[#6E5B5D] truncate">
                              {acc.roleLabel}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="form-register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleRegisterSubmit}
                  className="mt-4 space-y-3"
                >
                  {/* Live Admin Pass Preview */}
                  <div className="rounded-2xl bg-gradient-to-r from-[#540316] to-[#3B0310] text-[#FDFBF7] p-3 border border-[#DFBA70]/45 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FDFBF7]/12 border border-[#DFBA70]/70 flex items-center justify-center font-serif text-[15px] font-semibold text-[#F7E5B4] shrink-0">
                      {liveInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold truncate">
                        {fullName.trim() || 'Thẻ Admin Sovereign mới'}
                      </div>
                      <div className="font-mono text-[10.5px] text-[#F7E5B4] truncate">
                        Kho {regWarehouse} · {regEmail.trim() || 'email@sovereignsupply.vn'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FDFBF7]/15 text-[#F7E5B4] shrink-0">
                      {regWarehouse}
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-name"
                      className="block text-[11px] font-semibold text-[#5C4B4C] mb-1"
                    >
                      Họ và tên nhân sự
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#7D6C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="VD: Lê Hoàng Minh"
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[12.5px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="reg-email"
                        className="block text-[11px] font-semibold text-[#5C4B4C] mb-1"
                      >
                        Email công việc
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="ten@sovereignsupply.vn"
                        className="w-full h-10 px-3 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[12.5px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reg-password"
                        className="block text-[11px] font-semibold text-[#5C4B4C] mb-1"
                      >
                        Mật khẩu (&ge; 6 ký tự)
                      </label>
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full h-10 px-3 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[12.5px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="reg-wh"
                        className="block text-[11px] font-semibold text-[#5C4B4C] mb-1"
                      >
                        Kho phụ trách
                      </label>
                      <select
                        id="reg-wh"
                        value={regWarehouse}
                        onChange={(e) =>
                          setRegWarehouse(e.target.value as UserProfile['defaultWarehouseCode'])
                        }
                        className="w-full h-10 px-2.5 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[12px] font-medium text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      >
                        <option value="TB-01">Tân Bình (TB-01)</option>
                        <option value="BD-02">Bình Dương (BD-02)</option>
                        <option value="DN-03">Đà Nẵng (DN-03)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="reg-tab"
                        className="block text-[11px] font-semibold text-[#5C4B4C] mb-1"
                      >
                        Màn hình mặc định
                      </label>
                      <select
                        id="reg-tab"
                        value={regDefaultTab}
                        onChange={(e) => setRegDefaultTab(e.target.value as AdminTabId)}
                        className="w-full h-10 px-2.5 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF]/90 text-[12px] font-medium text-[#3D040E] focus:outline-none focus:border-[#640D22]"
                      >
                        <option value="overview">Tổng quan Admin</option>
                        <option value="sales">Đơn bán hàng</option>
                        <option value="fefo">Kho FEFO</option>
                        <option value="dispatch">Điều phối</option>
                        <option value="purchasing">Mua bù</option>
                      </select>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-[#640D22] hover:bg-[#540316] text-[#FFFFFF] text-[13px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[0_6px_18px_rgba(100,13,34,0.24)]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{busy ? 'Đang khởi tạo...' : 'Tạo tài khoản & Vào Dashboard'}</span>
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E5DBD0]/70 flex items-center justify-between text-[11px] text-[#7D6C6E]">
            <span>Sovereign Supply · Chuẩn mực FEFO</span>
            <span className="font-mono">TB-01 · BD-02 · DN-03</span>
          </div>
        </section>

        {/* Right Column: Live FEFO Warehouse Showcase */}
        <aside className="lg:col-span-6 rounded-[28px] bg-gradient-to-br from-[#5A071B] via-[#490414] to-[#2E020C] text-[#FDFBF7] p-5 sm:p-7 border border-[#DFBA70]/35 shadow-[0_20px_50px_rgba(61,4,14,0.28)] relative overflow-hidden flex flex-col justify-between">
          <span
            aria-hidden="true"
            className="header-shimmer pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#DFBA70]/15 blur-3xl"
          />

          <div className="relative z-10 space-y-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#F7E5B4]">
                Trạng thái kho tổng hiện hành
              </div>
              <h2 className="font-serif text-[26px] sm:text-[30px] font-semibold leading-tight mt-1.5 text-balance">
                Điều phối FEFO chuẩn xác từ lô đến POD.
              </h2>
              <p className="text-[12.5px] text-[#FDFBF7]/75 mt-2 leading-relaxed">
                Giám sát tồn khả dụng theo hạn sử dụng, xử lý thiếu hàng đa phương án và duyệt xuất
                kho tập trung trong một bảng điều khiển.
              </p>
            </div>

            {/* Live Server Preview Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-[#FFFFFF]/10 backdrop-blur-md border border-[#FFFFFF]/15 p-3">
                <div className="text-[10.5px] text-[#FDFBF7]/70">Lô FEFO</div>
                <div className="font-mono text-[20px] font-bold text-[#F7E5B4] mt-0.5 tabular-nums">
                  {preview?.totalLots ?? '5'}
                </div>
              </div>
              <div className="rounded-2xl bg-[#FFFFFF]/10 backdrop-blur-md border border-[#FFFFFF]/15 p-3">
                <div className="text-[10.5px] text-[#FDFBF7]/70">Đơn quản lý</div>
                <div className="font-mono text-[20px] font-bold text-[#FFFFFF] mt-0.5 tabular-nums">
                  {preview?.totalOrders ?? '2'}
                </div>
              </div>
              <div className="rounded-2xl bg-[#FFFFFF]/10 backdrop-blur-md border border-[#FFFFFF]/15 p-3">
                <div className="text-[10.5px] text-[#FDFBF7]/70">Điều phối</div>
                <div className="font-mono text-[20px] font-bold text-[#A7E3CA] mt-0.5 tabular-nums">
                  {preview?.activeDispatches ?? '1'}
                </div>
              </div>
            </div>

            {/* Live Sample Lots Preview */}
            <div className="rounded-2xl bg-[#FFFFFF]/8 backdrop-blur-md border border-[#FFFFFF]/14 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#F7E5B4]">Lô ưu tiên xuất sớm</span>
                <span className="font-mono text-[#FDFBF7]/65">Khả dụng / Đủ ĐK</span>
              </div>

              {(preview?.sampleLots ?? []).map((lot) => {
                const pct =
                  lot.qualifiedQty > 0
                    ? Math.min(100, Math.round((lot.available / lot.qualifiedQty) * 100))
                    : 0;
                return (
                  <div key={lot.lotId} className="space-y-1">
                    <div className="flex items-center justify-between text-[11.5px] gap-2">
                      <span className="truncate font-medium">
                        <span className="font-mono text-[#F7E5B4] mr-1.5">{lot.lotId}</span>
                        {lot.productName}
                      </span>
                      <span className="font-mono font-bold tabular-nums shrink-0 text-[#FFFFFF]">
                        {lot.available}/{lot.qualifiedQty}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#FFFFFF]/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#DFBA70] to-[#F7E5B4]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive 3-Step Workflow Showcase */}
          <div className="relative z-10 mt-5 pt-4 border-t border-[#FFFFFF]/15 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              {WORKFLOW_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const active = activeStepIdx === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStepIdx(idx)}
                    className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#FFFFFF]/18 border-[#DFBA70]/70 text-[#FFFFFF]'
                        : 'bg-[#FFFFFF]/6 border-[#FFFFFF]/10 text-[#FDFBF7]/70 hover:bg-[#FFFFFF]/12'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5 text-[#F7E5B4] mb-1" />
                    <div className="text-[10.5px] font-bold leading-tight">{step.title}</div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="text-[11.5px] text-[#FDFBF7]/85 flex items-start gap-2 bg-[#FFFFFF]/8 rounded-xl px-3 py-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A7E3CA] shrink-0 mt-0.5" />
                <span>{activeStep.summary}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </motion.div>
    </div>
  );
}
