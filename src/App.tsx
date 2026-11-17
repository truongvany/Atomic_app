import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  ShoppingBag,
  Truck,
  Warehouse,
} from 'lucide-react';
import type { AdminTabId, MobileSupplyState, UserProfile } from './types/logistics';
import { AuthPortal } from './components/AuthPortal';
import { BrandLogo } from './components/BrandLogo';
import { ProfileScreen, getInitials } from './components/ProfileScreen';
import { AdminOverviewTab } from './components/AdminOverviewTab';
import { SalesTab } from './components/SalesTab';
import { PurchasingTab } from './components/PurchasingTab';
import { FefoWarehouseTab } from './components/FefoWarehouseTab';
import { DispatchTab } from './components/DispatchTab';
import { NewSalesOrderSheet } from './components/SalesModals';

type WarehouseFilter = 'ALL' | 'TB-01' | 'BD-02' | 'DN-03';
const SESSION_STORAGE_KEY = 'sovereign_admin_session_token';

const ADMIN_TABS: Array<{
  id: AdminTabId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Tổng quan Admin', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'sales', label: 'Đơn bán hàng', shortLabel: 'Đơn hàng', icon: FileText },
  { id: 'fefo', label: 'Kho FEFO', shortLabel: 'Kho FEFO', icon: Warehouse },
  { id: 'dispatch', label: 'Điều phối giao', shortLabel: 'Điều phối', icon: Truck },
  { id: 'purchasing', label: 'Mua bù FEFO', shortLabel: 'Mua bù', icon: ShoppingBag },
];

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  try {
    const token = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Ignore storage access restriction
  }
  return headers;
}

function storeSessionToken(token?: string) {
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access restriction
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [state, setState] = useState<MobileSupplyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseFilter>('ALL');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderBusy, setNewOrderBusy] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('SO-2024-089');
  const [toast, setToast] = useState<string | null>(null);
  const [shimmerKey, setShimmerKey] = useState(0);

  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const notify = useCallback(
    (msg: string) => {
      if (state && !state.profile.settings.actionToasts) return;
      setToast(msg);
      window.setTimeout(() => {
        setToast((curr) => (curr === msg ? null : curr));
      }, 2800);
    },
    [state]
  );

  const applyAuthenticatedSession = useCallback(
    (data: MobileSupplyState, token?: string) => {
      if (token) storeSessionToken(token);
      setState(data);
      setAuthenticated(true);
      setError(null);
      setIsProfileOpen(false);
      const validTabs: AdminTabId[] = ['overview', 'sales', 'fefo', 'dispatch', 'purchasing'];
      const initialTab = validTabs.includes(data.profile?.defaultRole)
        ? data.profile.defaultRole
        : 'overview';
      setActiveTab(initialTab);
      if (data.salesOrders.length > 0) {
        setSelectedOrderId((prev) =>
          data.salesOrders.some((o) => o.id === prev) ? prev : data.salesOrders[0].id
        );
      }
    },
    []
  );

  const checkSession = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Lỗi máy chủ (${res.status})`);
      const data = (await res.json()) as {
        authenticated: boolean;
        token?: string;
        state?: MobileSupplyState;
      };
      if (data.authenticated && data.state) {
        applyAuthenticatedSession(data.state, data.token);
      } else {
        storeSessionToken(undefined);
        setAuthenticated(false);
        setState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối máy chủ.');
    } finally {
      setAuthReady(true);
    }
  }, [applyAuthenticatedSession]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const handleLogin = async (payload: { email: string; password: string }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      authenticated?: boolean;
      token?: string;
      state?: MobileSupplyState;
      error?: string;
    };
    if (!res.ok || !data.authenticated || !data.state) {
      throw new Error(data.error || 'Đăng nhập thất bại.');
    }
    applyAuthenticatedSession(data.state, data.token);
    notify(`Chào mừng ${data.state.profile.fullName}.`);
  };

  const handleRegister = async (payload: {
    fullName: string;
    email: string;
    password: string;
    defaultWarehouseCode: UserProfile['defaultWarehouseCode'];
    defaultRole: AdminTabId;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      authenticated?: boolean;
      token?: string;
      state?: MobileSupplyState;
      error?: string;
    };
    if (!res.ok || !data.authenticated || !data.state) {
      throw new Error(data.error || 'Không thể tạo tài khoản.');
    }
    applyAuthenticatedSession(data.state, data.token);
    notify(`Đã tạo tài khoản ${data.state.profile.fullName}.`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });
    } finally {
      storeSessionToken(undefined);
      setAuthenticated(false);
      setState(null);
      setIsProfileOpen(false);
      setToast(null);
    }
  };

  const handleLogoTap = () => {
    setShimmerKey((k) => k + 1);
    setIsProfileOpen(false);
    setActiveTab('overview');
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabSwitch = (nextTab: AdminTabId) => {
    setIsProfileOpen(false);
    setActiveTab(nextTab);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApiPost = async (
    url: string,
    body?: unknown,
    successMessage?: string
  ): Promise<MobileSupplyState> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      await handleLogout();
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    const data = (await res.json()) as {
      state?: MobileSupplyState;
      order?: { id: string };
      error?: string;
    };
    if (!res.ok || !data.state) {
      const msg = data.error || 'Thao tác thất bại.';
      notify(msg);
      throw new Error(msg);
    }
    setState(data.state);
    if (data.order?.id) {
      setSelectedOrderId(data.order.id);
    }
    if (successMessage) notify(successMessage);
    return data.state;
  };

  const handleAdjustLot = async (lotId: string, deltaQualified: number) => {
    const res = await fetch(`/api/fefo-lots/${encodeURIComponent(lotId)}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      body: JSON.stringify({ deltaQualified }),
    });
    if (res.status === 401) {
      await handleLogout();
      return;
    }
    const data = (await res.json()) as { state?: MobileSupplyState; error?: string };
    if (!res.ok || !data.state) {
      notify(data.error || 'Không thể điều chỉnh tồn lô.');
      return;
    }
    setState(data.state);
    notify(`Cập nhật lô ${lotId} (${deltaQualified > 0 ? `+${deltaQualified}` : deltaQualified}).`);
  };

  const handleSaveProfile = async (patch: Partial<UserProfile>) => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      body: JSON.stringify(patch),
    });
    if (res.status === 401) {
      await handleLogout();
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    const data = (await res.json()) as { state?: MobileSupplyState; error?: string };
    if (!res.ok || !data.state) {
      const msg = data.error || 'Không thể lưu hồ sơ.';
      notify(msg);
      throw new Error(msg);
    }
    setState(data.state);
    notify('Đã cập nhật hồ sơ & cài đặt.');
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });
      if (res.status === 401) {
        await handleLogout();
        return;
      }
      if (!res.ok) throw new Error('Reset thất bại');
      const data = (await res.json()) as MobileSupplyState;
      setState(data);
      setSelectedOrderId('SO-2024-089');
      setWarehouseFilter('ALL');
      setIsProfileOpen(false);
      setActiveTab('overview');
      notify('Đã khôi phục dữ liệu mẫu SO-2024-089.');
    } catch {
      notify('Không thể khôi phục dữ liệu.');
    }
  };

  const handleCreateOrder = async (payload: {
    customerName: string;
    scheduledDeliveryLabel: string;
    items: Array<{ sku: string; requestedQty: number }>;
  }) => {
    setNewOrderBusy(true);
    try {
      await handleApiPost('/api/sales-orders', payload, 'Đã tạo đơn bán mới.');
      setIsProfileOpen(false);
      setActiveTab('sales');
    } finally {
      setNewOrderBusy(false);
    }
  };

  const filteredSalesOrders = useMemo(() => {
    if (!state) return [];
    if (warehouseFilter === 'ALL') return state.salesOrders;
    return state.salesOrders.filter((o) => o.warehouseCode === warehouseFilter);
  }, [state, warehouseFilter]);

  const filteredLots = useMemo(() => {
    if (!state) return [];
    if (warehouseFilter === 'ALL') return state.fefoLots;
    return state.fefoLots.filter((l) => l.warehouseCode === warehouseFilter);
  }, [state, warehouseFilter]);

  const filteredPurchaseOrders = useMemo(() => {
    if (!state) return [];
    if (warehouseFilter === 'ALL') return state.purchaseOrders;
    return state.purchaseOrders.filter((p) => p.warehouseCode === warehouseFilter);
  }, [state, warehouseFilter]);

  const activeOrder =
    filteredSalesOrders.find((o) => o.id === selectedOrderId) ?? filteredSalesOrders[0] ?? null;

  const badgeByTab: Record<AdminTabId, number> = {
    overview: state?.approvals.filter((a) => a.status === 'Chờ duyệt').length ?? 0,
    sales: filteredSalesOrders.filter((o) => o.status === 'Nháp' || o.status === 'Chờ duyệt').length,
    fefo: filteredLots.filter((l) => Math.max(0, l.qualifiedQty - l.reservedQty) <= 85).length,
    dispatch: filteredSalesOrders.filter(
      (o) => o.status === 'Đã giữ FEFO' || o.status === 'Đang giao'
    ).length,
    purchasing: filteredPurchaseOrders.filter((p) => p.status !== 'Đã nhập kho').length,
  };

  const liquidGlassEnabled = state?.profile.settings.liquidGlass ?? true;
  const fefoAlertsEnabled = state?.profile.settings.fefoAlerts ?? true;
  const avatarInitials = getInitials(state?.profile.fullName ?? 'Minh Anh');
  const currentTabMeta = ADMIN_TABS.find((t) => t.id === activeTab) ?? ADMIN_TABS[0];

  if (!authReady) {
    return (
      <div className="min-h-screen w-full bg-[#FAF6F2] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo size="md" />
          <div className="text-[13px] font-medium text-[#6E5B5D]">Đang kiểm tra phiên đăng nhập...</div>
        </div>
      </div>
    );
  }

  if (!authenticated || !state) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthPortal onLogin={handleLogin} onRegister={handleRegister} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen w-full bg-[#FAF6F2] text-[#3D040E] relative overflow-x-hidden">
        {/* Subtle Warm Ambient Depth for Liquid Glass Refraction */}
        {liquidGlassEnabled && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none fixed -top-20 -right-16 w-80 h-80 rounded-full bg-[#F3D9DE]/45 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none fixed bottom-0 left-10 w-80 h-60 rounded-full bg-[#F7E7CE]/50 blur-3xl"
            />
          </>
        )}

        {/* Floating Rounded Liquid Glass Admin Header */}
        <div className="sticky top-0 z-30 max-w-[1440px] mx-auto px-3 pt-2.5 sm:px-5 lg:px-6 pointer-events-none">
          <header
            className={`${
              liquidGlassEnabled
                ? 'liquid-glass-header'
                : 'bg-[#FDFBF7]/95 border border-[#E5DBD0] shadow-sm'
            } pointer-events-auto relative h-13 rounded-[22px] px-3 sm:px-4 flex items-center justify-between gap-3 overflow-hidden`}
          >
            {liquidGlassEnabled && (
              <span
                aria-hidden="true"
                className="header-shimmer pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
              />
            )}

            {/* Left Zone: Logo + Clean Brand Title (Protected with min-w-0 & truncate) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
              <BrandLogo size="sm" shimmerKey={shimmerKey} onClick={handleLogoTap} />
              <button
                type="button"
                onClick={handleLogoTap}
                className="min-w-0 flex items-baseline gap-1.5 text-left cursor-pointer"
              >
                <span className="font-serif text-[17px] sm:text-[18px] font-semibold text-[#3D040E] tracking-[-0.02em] truncate">
                  Sovereign
                </span>
                <span className="hidden sm:inline text-[11.5px] font-medium text-[#7D6C6E] whitespace-nowrap shrink-0">
                  Admin
                </span>
              </button>
            </div>

            {/* Right Zone: Strictly 2 Focal Controls (+ Tạo đơn & Avatar) */}
            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setNewOrderOpen(true)}
                className="h-8 px-3 rounded-full bg-[#640D22] hover:bg-[#540316] text-[#FFFFFF] text-[11.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-[0_3px_10px_rgba(100,13,34,0.22)] whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo đơn</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-label="Mở trang Profile và Cài đặt"
                className={`relative w-8 h-8 rounded-full p-[1.5px] cursor-pointer transition-shadow shrink-0 ${
                  isProfileOpen
                    ? 'ring-2 ring-[#640D22] shadow-[0_0_0_3px_rgba(100,13,34,0.14)]'
                    : 'shadow-[0_3px_10px_rgba(61,4,14,0.18)]'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #F7E5B4 0%, #DFBA70 50%, #721C2A 100%)',
                }}
              >
                <span className="w-full h-full rounded-full bg-gradient-to-br from-[#6D1227] to-[#410311] text-[#F7E5B4] font-serif text-[11px] font-semibold flex items-center justify-center">
                  {avatarInitials}
                </span>
              </motion.button>
            </div>
          </header>
        </div>

        {/* Full-Screen Responsive Admin Workspace */}
        <div className="max-w-[1440px] mx-auto flex min-h-[calc(100vh-64px)] relative z-10">
          {/* Desktop Floating Liquid Glass Sidebar */}
          <aside
            aria-label="Menu quản trị"
            className={`${
              liquidGlassEnabled
                ? 'liquid-glass-sidebar'
                : 'bg-[#FDFBF7] border border-[#E5DBD0]'
            } hidden lg:flex lg:w-[236px] shrink-0 flex-col justify-between p-3.5 ml-6 mt-3 mb-4 rounded-[24px] sticky top-[76px] h-[calc(100vh-92px)]`}
          >
            <div className="space-y-1">
              <div className="px-2.5 pb-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#7D6C6E]">
                Điều hành kho FEFO
              </div>
              {ADMIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = !isProfileOpen && activeTab === tab.id;
                const count = badgeByTab[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSwitch(tab.id)}
                    className={`relative w-full h-10 px-3 rounded-xl flex items-center justify-between gap-2 text-[13px] transition-colors cursor-pointer ${
                      active
                        ? 'text-[#640D22] font-bold'
                        : 'text-[#5C4B4C] font-medium hover:text-[#3D040E] hover:bg-[#FFFFFF]/55'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-nav-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="liquid-glass-nav-pill absolute inset-0 rounded-xl"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                      <span className="truncate">{tab.label}</span>
                    </span>
                    {count > 0 && (
                      <span
                        className={`relative z-10 min-w-[20px] h-5 px-1.5 rounded-full font-mono text-[10.5px] font-bold inline-flex items-center justify-center tabular-nums ${
                          active
                            ? 'bg-[#640D22] text-[#FFFFFF]'
                            : 'bg-[#F3E7CB] text-[#855800]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Admin Account & Logout Footer */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="w-full p-2.5 rounded-xl bg-[#FFFFFF]/85 border border-[#EAE2D9] hover:border-[#640D22]/30 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#640D22] text-[#F7E5B4] font-serif text-[12px] font-semibold flex items-center justify-center shrink-0">
                  {avatarInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-[#3D040E] truncate">
                    {state.profile.fullName}
                  </div>
                  <div className="font-mono text-[10px] text-[#7D6C6E] truncate">
                    {state.profile.employeeCode} · {state.profile.defaultWarehouseCode}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-9 px-3 rounded-xl border border-[#F5C6CE] bg-[#FFF0F2]/80 hover:bg-[#FFE4E8] text-[#991B1B] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>

          {/* Main Dashboard Content */}
          <main
            ref={mainScrollRef}
            className="flex-1 min-w-0 px-3 sm:px-5 lg:px-6 pt-3.5 pb-24 lg:pb-8"
          >
            {error ? (
              <div className="max-w-lg mx-auto p-5 rounded-2xl bg-[#FFF0F2] border border-[#F5C6CE] text-[#991B1B] space-y-3">
                <div className="text-[14px] font-bold">Không thể kết nối máy chủ</div>
                <p className="text-[12px]">{error}</p>
                <button
                  type="button"
                  onClick={checkSession}
                  className="px-4 py-2 rounded-xl bg-[#640D22] text-[#FFFFFF] text-[12px] font-bold cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : isProfileOpen ? (
              <ProfileScreen
                profile={state.profile}
                onBack={() => setIsProfileOpen(false)}
                onSaveProfile={handleSaveProfile}
                onResetSeed={handleReset}
                onLogout={handleLogout}
              />
            ) : (
              <>
                {/* Workspace Context & Segmented Warehouse Filter */}
                <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="min-w-0">
                    <h1 className="text-[16px] sm:text-[18px] font-bold text-[#3D040E] leading-tight truncate">
                      {currentTabMeta.label}
                    </h1>
                    <p className="text-[11px] text-[#7D6C6E] mt-0.5">
                      Phạm vi:{' '}
                      <span className="font-mono font-semibold text-[#640D22]">
                        {warehouseFilter === 'ALL' ? 'Tất cả kho' : `Kho ${warehouseFilter}`}
                      </span>{' '}
                      · Tài khoản {state.profile.fullName}
                    </p>
                  </div>

                  <div
                    role="group"
                    aria-label="Lọc dữ liệu theo kho"
                    className="inline-flex items-center p-1 rounded-full bg-[#EFE6DC]/85 border border-[#FFFFFF]/80 self-start sm:self-auto shrink-0"
                  >
                    {(
                      [
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'TB-01', label: 'TB-01' },
                        { id: 'BD-02', label: 'BD-02' },
                        { id: 'DN-03', label: 'DN-03' },
                      ] as const
                    ).map((wh) => {
                      const active = warehouseFilter === wh.id;
                      return (
                        <button
                          key={wh.id}
                          type="button"
                          onClick={() => setWarehouseFilter(wh.id)}
                          className={`relative px-2.5 sm:px-3 h-7 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            active ? 'text-[#FFFFFF]' : 'text-[#5C4B4C] hover:text-[#3D040E]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="warehouse-filter-pill"
                              transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                              className="liquid-glass-role-pill absolute inset-0 rounded-full"
                            />
                          )}
                          <span className="relative z-10">{wh.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                  {activeTab === 'overview' && (
                    <AdminOverviewTab
                      salesOrders={filteredSalesOrders}
                      lots={filteredLots}
                      purchaseOrders={filteredPurchaseOrders}
                      approvals={state.approvals}
                      onNavigateTab={handleTabSwitch}
                      onInspectOrder={(orderId) => {
                        setSelectedOrderId(orderId);
                        handleTabSwitch('sales');
                      }}
                      onReserveFefo={async (orderId) => {
                        await handleApiPost(
                          `/api/sales-orders/${encodeURIComponent(orderId)}/reserve-fefo`,
                          undefined,
                          `Đã giữ lô FEFO cho ${orderId}.`
                        );
                      }}
                      onDecideApproval={async (aprId, decision) => {
                        await handleApiPost(
                          `/api/approvals/${encodeURIComponent(aprId)}/decide`,
                          { decision },
                          `Đã ${decision.toLowerCase()} ${aprId}.`
                        );
                      }}
                      onAdjustLot={handleAdjustLot}
                      onAdvanceDispatch={async (orderId) => {
                        await handleApiPost(
                          `/api/dispatch/${encodeURIComponent(orderId)}/advance`,
                          undefined,
                          `Đã cập nhật chặng giao ${orderId}.`
                        );
                      }}
                    />
                  )}

                  {activeTab === 'sales' && (
                    <SalesTab
                      orders={filteredSalesOrders}
                      selectedOrder={activeOrder}
                      lots={filteredLots}
                      showFefoAlerts={fefoAlertsEnabled}
                      onSelectOrderId={(id) => setSelectedOrderId(id)}
                      onOpenCreateOrder={() => setNewOrderOpen(true)}
                      onReserveFefo={async (orderId) => {
                        await handleApiPost(
                          `/api/sales-orders/${encodeURIComponent(orderId)}/reserve-fefo`,
                          undefined,
                          `Đã giữ lô FEFO cho ${orderId}.`
                        );
                      }}
                      onResolveShortage={async (orderId, strategy, sku) => {
                        const msgMap = {
                          adjust_qty: 'Đã khớp số lượng theo khả dụng.',
                          create_po: 'Đã tạo phiếu mua bù.',
                          request_split: 'Đã gửi yêu cầu duyệt tách giao.',
                        };
                        await handleApiPost(
                          `/api/sales-orders/${encodeURIComponent(orderId)}/resolve-shortage`,
                          { strategy, sku },
                          msgMap[strategy]
                        );
                      }}
                      onCancelOrder={async (orderId, reason) => {
                        await handleApiPost(
                          `/api/sales-orders/${encodeURIComponent(orderId)}/cancel`,
                          { reason },
                          `Đã dừng ${orderId} & chuyển quyết toán.`
                        );
                      }}
                    />
                  )}

                  {activeTab === 'fefo' && (
                    <FefoWarehouseTab lots={filteredLots} onAdjustLot={handleAdjustLot} />
                  )}

                  {activeTab === 'dispatch' && (
                    <DispatchTab
                      salesOrders={filteredSalesOrders}
                      onAdvanceDispatch={async (orderId) => {
                        await handleApiPost(
                          `/api/dispatch/${encodeURIComponent(orderId)}/advance`,
                          undefined,
                          `Đã cập nhật chặng giao ${orderId}.`
                        );
                      }}
                    />
                  )}

                  {activeTab === 'purchasing' && (
                    <PurchasingTab
                      purchaseOrders={filteredPurchaseOrders}
                      lots={filteredLots}
                      onReceivePo={async (poId) => {
                        await handleApiPost(
                          `/api/purchase-orders/${encodeURIComponent(poId)}/receive`,
                          undefined,
                          `Đã nhập kho ${poId} vào lô FEFO.`
                        );
                      }}
                      onCreatePo={async (payload) => {
                        await handleApiPost(
                          '/api/purchase-orders',
                          payload,
                          'Đã phát hành phiếu mua.'
                        );
                      }}
                    />
                  )}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </main>
        </div>

        {/* Mobile Floating Liquid Glass Bottom Dock */}
        <nav
          aria-label="Điều hướng chính"
          className={`${
            liquidGlassEnabled
              ? 'liquid-glass-dock'
              : 'bg-[#FDFBF7] border border-[#E5DBD0] shadow-lg'
          } lg:hidden fixed bottom-3 inset-x-3 z-30 rounded-[24px] p-1.5 grid grid-cols-5 items-center`}
        >
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = !isProfileOpen && activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => handleTabSwitch(tab.id)}
                className={`relative h-[46px] rounded-[18px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  active ? 'text-[#640D22]' : 'text-[#736264] hover:text-[#3D040E]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    transition={{ type: 'spring', stiffness: 430, damping: 32 }}
                    className="liquid-glass-nav-pill absolute inset-0 rounded-[18px]"
                  />
                )}
                <Icon
                  className="relative z-10 w-[17px] h-[17px]"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span
                  className={`relative z-10 text-[9.5px] leading-none ${
                    active ? 'font-bold' : 'font-medium'
                  }`}
                >
                  {tab.shortLabel}
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Global Create Sales Order Dialog/Sheet */}
        <NewSalesOrderSheet
          isOpen={newOrderOpen}
          lots={state.fefoLots}
          busy={newOrderBusy}
          onClose={() => setNewOrderOpen(false)}
          onCreateOrder={handleCreateOrder}
        />

        {/* Animated Action Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast-banner"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              role="status"
              aria-live="polite"
              className="fixed bottom-[76px] lg:bottom-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-[#3D040E]/92 backdrop-blur-md text-[#FDFBF7] border border-[#FFFFFF]/15 text-[12px] font-medium shadow-xl text-center whitespace-nowrap max-w-[90vw] truncate"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
