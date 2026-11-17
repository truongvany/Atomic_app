import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, LogOut, RotateCcw, Sparkles, Bell, AlertTriangle, Save } from 'lucide-react';
import type { ProfileSettings, UserProfile } from '../types/logistics';

interface ProfileScreenProps {
  profile: UserProfile;
  onBack: () => void;
  onSaveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  onResetSeed: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function ProfileScreen({
  profile,
  onBack,
  onSaveProfile,
  onResetSeed,
  onLogout,
}: ProfileScreenProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [employeeCode, setEmployeeCode] = useState(profile.employeeCode);
  const [email, setEmail] = useState(profile.email);
  const [defaultRole, setDefaultRole] = useState(profile.defaultRole);
  const [defaultWarehouseCode, setDefaultWarehouseCode] = useState(profile.defaultWarehouseCode);
  const [settings, setSettings] = useState<ProfileSettings>(profile.settings);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = getInitials(fullName || profile.fullName);

  const toggleSetting = async (key: keyof ProfileSettings) => {
    const nextSettings = { ...settings, [key]: !settings[key] };
    setSettings(nextSettings);
    // Persist toggle immediately for instant feedback
    await onSaveProfile({ settings: nextSettings });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ tên nhân viên.');
      return;
    }
    setSaving(true);
    try {
      await onSaveProfile({
        fullName: fullName.trim(),
        employeeCode: employeeCode.trim(),
        email: email.trim(),
        defaultRole,
        defaultWarehouseCode,
        settings,
      });
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[820px] mx-auto space-y-4 pb-6"
    >
      {/* Back Bar */}
      <div className="flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF]/90 border border-[#E5DBD0] text-[12px] font-semibold text-[#3D040E] cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </motion.button>
        <span className="text-[11px] font-semibold text-[#7D6C6E]">Hồ sơ &amp; Cài đặt</span>
      </div>

      {/* Hero Profile Card */}
      <section className="rounded-2xl bg-gradient-to-br from-[#640D22] via-[#540619] to-[#3B0310] text-[#FDFBF7] p-4 border border-[#DFBA70]/40 shadow-[0_10px_24px_-6px_rgba(61,4,14,0.3)] relative overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#DFBA70]/15 blur-2xl"
        />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#FDFBF7]/12 border border-[#DFBA70]/75 flex items-center justify-center font-serif text-[20px] font-semibold text-[#F7E5B4] shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold truncate leading-tight">
              {fullName || 'Nhân viên vận hành'}
            </h2>
            <div className="font-mono text-[11px] text-[#F7E5B4] mt-0.5 tabular-nums">
              {employeeCode} · Kho {defaultWarehouseCode}
            </div>
            <div className="text-[11px] text-[#FDFBF7]/75 truncate mt-0.5">{email}</div>
          </div>
        </div>
      </section>

      {/* Editable Profile Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-4 space-y-3 shadow-[0_2px_8px_rgba(61,4,14,0.04)]"
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#640D22]">
          Thông tin nhân viên
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-[#FFF0F2] border border-[#F5C6CE] text-[#991B1B] text-[12px]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="prof-name" className="block text-[11px] font-semibold text-[#5C4B4C] mb-1">
            Họ và tên
          </label>
          <input
            id="prof-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-10 rounded-xl border border-[#DDD3C8] bg-[#FDFBF7] px-3 text-[13px] font-medium text-[#3D040E] focus:outline-none focus:border-[#640D22]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="prof-code" className="block text-[11px] font-semibold text-[#5C4B4C] mb-1">
              Mã nhân viên
            </label>
            <input
              id="prof-code"
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#DDD3C8] bg-[#FDFBF7] px-3 font-mono text-[12px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
            />
          </div>

          <div>
            <label htmlFor="prof-wh" className="block text-[11px] font-semibold text-[#5C4B4C] mb-1">
              Kho mặc định
            </label>
            <select
              id="prof-wh"
              value={defaultWarehouseCode}
              onChange={(e) =>
                setDefaultWarehouseCode(e.target.value as UserProfile['defaultWarehouseCode'])
              }
              className="w-full h-10 rounded-xl border border-[#DDD3C8] bg-[#FDFBF7] px-2.5 text-[12px] font-medium text-[#3D040E] focus:outline-none focus:border-[#640D22]"
            >
              <option value="TB-01">Tân Bình (TB-01)</option>
              <option value="BD-02">Bình Dương (BD-02)</option>
              <option value="DN-03">Đà Nẵng (DN-03)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="prof-email" className="block text-[11px] font-semibold text-[#5C4B4C] mb-1">
              Email nội bộ
            </label>
            <input
              id="prof-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#DDD3C8] bg-[#FDFBF7] px-3 text-[12px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
            />
          </div>

          <div>
            <label htmlFor="prof-role" className="block text-[11px] font-semibold text-[#5C4B4C] mb-1">
              Màn hình mặc định
            </label>
            <select
              id="prof-role"
              value={defaultRole}
              onChange={(e) =>
                setDefaultRole(e.target.value as UserProfile['defaultRole'])
              }
              className="w-full h-10 rounded-xl border border-[#DDD3C8] bg-[#FDFBF7] px-2.5 text-[12px] font-medium text-[#3D040E] focus:outline-none focus:border-[#640D22]"
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
          whileTap={{ scale: 0.97 }}
          disabled={saving}
          className="w-full min-h-[42px] rounded-xl bg-[#640D22] hover:bg-[#540316] text-[#FFFFFF] text-[13px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {savedFlag ? (
            <>
              <Check className="w-4 h-4" />
              <span>Đã lưu hồ sơ</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}</span>
            </>
          )}
        </motion.button>
      </form>

      {/* Profile Settings Toggles */}
      <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] divide-y divide-[#F2ECE5] shadow-[0_2px_8px_rgba(61,4,14,0.04)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#FAF6F2] text-[11px] font-bold uppercase tracking-[0.04em] text-[#640D22]">
          Cài đặt giao diện &amp; vận hành
        </div>

        <SettingSwitchRow
          icon={<Sparkles className="w-4 h-4 text-[#640D22]" />}
          title="Hiệu ứng Liquid Glass & Shimmer"
          description="Kính mờ phản quang cho Header & thanh Dock đáy"
          checked={settings.liquidGlass}
          onToggle={() => toggleSetting('liquidGlass')}
        />

        <SettingSwitchRow
          icon={<AlertTriangle className="w-4 h-4 text-[#B45309]" />}
          title="Cảnh báo thiếu hàng FEFO"
          description="Hiện thanh nhắc trạng thái tồn khả dụng ở Bán hàng"
          checked={settings.fefoAlerts}
          onToggle={() => toggleSetting('fefoAlerts')}
        />

        <SettingSwitchRow
          icon={<Bell className="w-4 h-4 text-[#0D7A52]" />}
          title="Thông báo phản hồi thao tác"
          description="Hiện thẻ xác nhận nhanh khi giữ lô hoặc duyệt đơn"
          checked={settings.actionToasts}
          onToggle={() => toggleSetting('actionToasts')}
        />
      </section>

      {/* Data & Session Management */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-[#3D040E]">Dữ liệu mẫu mặc định</div>
            <div className="text-[11px] text-[#6E5B5D]">Khôi phục đơn SO-2024-089 &amp; các lô FEFO</div>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onResetSeed}
            className="px-3 py-2 rounded-xl border border-[#DDD3C8] bg-[#FAF6F2] text-[12px] font-bold text-[#3D040E] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục</span>
          </motion.button>
        </section>

        <section className="rounded-2xl bg-[#FFF0F2]/80 border border-[#F5C6CE] p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[#7A1023]">Phiên đăng nhập</div>
            <div className="text-[11px] text-[#991B1B] truncate">{profile.email}</div>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-[#991B1B] text-[#FFFFFF] text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </motion.button>
        </section>
      </div>
    </motion.div>
  );
}

function SettingSwitchRow({
  icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-xl bg-[#F7F3EE] inline-flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#3D040E] leading-snug">{title}</div>
          <div className="text-[11px] text-[#6E5B5D] mt-0.5">{description}</div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onToggle}
        className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center ${
          checked ? 'bg-[#640D22] justify-end' : 'bg-[#DDD3C8] justify-start'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="w-5 h-5 rounded-full bg-[#FFFFFF] shadow-sm block"
        />
      </button>
    </div>
  );
}
