/**
 * QR Payment Page — /payment/:orderId
 *
 * Opened when customer scans QR code on vending machine.
 * Flow:
 *   1. Show order details (product, amount)
 *   2. Quick payment buttons (Click, Payme, Uzum) — no login required
 *   3. "Оплата с выгодой" — login via Telegram/Google to earn bonuses
 *   4. After login: show bonus info, order status
 *   5. Select provider → redirect to checkout URL (wired later)
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useUserStore } from "@/lib/store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderInfo {
  id: string;
  orderNumber: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  machineCode?: string;
}

interface BonusInfo {
  currentBalance: number;
  earnableBonus: number;
  bonusPercent: number;
}

type PaymentProvider = "click" | "payme" | "uzum";

// ─── Payment logo fallback ───────────────────────────────────────────────────

function PaymentLogo({
  src,
  alt,
  fallbackText,
  fallbackColor,
}: {
  src: string;
  alt: string;
  fallbackText: string;
  fallbackColor: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <span className={`font-bold text-lg ${fallbackColor}`}>
        {fallbackText}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-8"
      onError={() => setImgError(true)}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { t: _t } = useTranslation();
  const { isAuthenticated, user } = useUserStore();

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [bonus, setBonus] = useState<BonusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load order info ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orderId) return;

    const loadOrder = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/orders/${orderId}/payment-info`);
        setOrder(res.data);
      } catch {
        setError("Заказ не найден");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // ─── Load bonus info after login ────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !orderId) return;

    const loadBonus = async () => {
      try {
        const res = await api.get(`/orders/${orderId}/bonus-preview`);
        setBonus(res.data);
      } catch {
        // Bonus preview not critical — silently ignore
      }
    };

    loadBonus();
  }, [isAuthenticated, orderId]);

  // ─── Payment handler ───────────────────────────────────────────────────────

  const handlePayment = async (provider: PaymentProvider) => {
    if (!order) return;

    setPaying(true);
    try {
      const res = await api.post(`/payments/${provider}/create`, {
        orderId: order.id,
        amount: order.amount,
      });

      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Не удалось создать платёж");
      }
    } catch {
      toast.error("Ошибка при создании платежа");
    } finally {
      setPaying(false);
    }
  };

  // ─── Telegram login ─────────────────────────────────────────────────────────

  const handleTelegramLogin = () => {
    const botUsername =
      import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "VendHubBot";
    window.location.href = `https://t.me/${botUsername}?start=login_${orderId}&startapp=payment_${orderId}`;
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B6F47] border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#8B6F47] text-lg">{error || "Заказ не найден"}</p>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "COMPLETED";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      {/* ─── Auth header (after login) ────────────────────────────── */}
      {isAuthenticated && user && (
        <div className="bg-white border-b border-[#E8DDD0] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#8B6F47]/10 rounded-full flex items-center justify-center text-sm">
              👤
            </div>
            <div className="text-sm">
              <span className="text-[#6B5B4A]">Вы авторизованы через: </span>
              <strong className="text-[#3D2E1F]">Telegram</strong>
              <br />
              <span className="text-[#6B5B4A]">Пользователь: </span>
              <strong className="text-[#3D2E1F]">
                {user.firstName || user.username || "Пользователь"}
              </strong>
            </div>
          </div>
          <button
            onClick={() => useUserStore.getState().logout()}
            className="text-sm text-[#8B6F47] border border-[#D4C4B0] rounded px-3 py-1 hover:bg-[#F5EDE3]"
          >
            Выйти
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-6">
        {/* ─── Title ──────────────────────────────────────────────── */}
        <h1 className="text-2xl font-bold text-[#3D2E1F] text-center mb-6">
          Оплата заказа {order.orderNumber}
        </h1>

        {/* ─── Order details ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E8DDD0] p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#6B5B4A]">Наименование товара:</span>
            <strong className="text-[#3D2E1F]">{order.productName}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6B5B4A]">Сумма товара:</span>
            <strong className="text-[#C0392B] text-lg">
              {order.amount.toLocaleString("ru-RU")} {order.currency || "сум"}
            </strong>
          </div>
        </div>

        {/* ─── Bonus (visible after login) ────────────────────────── */}
        {isAuthenticated && bonus && (
          <div className="bg-white rounded-xl border border-[#E8DDD0] p-4 mb-4">
            {!showBonus ? (
              <button
                onClick={() => setShowBonus(true)}
                className="text-sm text-[#8B6F47] border border-[#D4C4B0] rounded px-3 py-1 hover:bg-[#F5EDE3]"
              >
                Показать начисленный бонус
              </button>
            ) : (
              <div className="text-sm text-[#6B5B4A]">
                <p>
                  Бонус за оплату:{" "}
                  <strong className="text-[#27AE60]">
                    +{bonus.earnableBonus.toLocaleString()} сум (
                    {bonus.bonusPercent}%)
                  </strong>
                </p>
                <p className="mt-1">
                  Текущий баланс: {bonus.currentBalance.toLocaleString()} сум
                </p>
              </div>
            )}

            {!isPaid && (
              <p className="text-[#C0392B] text-sm mt-2">
                Заказ № {order.orderNumber} не оплачен.
                <br />
                Для получения бонуса необходимо провести платёж
              </p>
            )}
          </div>
        )}

        {/* ─── Paid status ────────────────────────────────────────── */}
        {isPaid && (
          <div className="bg-[#27AE60]/10 border border-[#27AE60]/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-[#27AE60] font-bold text-lg">Заказ оплачен</p>
            <p className="text-[#6B5B4A] text-sm mt-1">
              Ожидайте выдачу товара на автомате
            </p>
          </div>
        )}

        {/* ─── Payment section ────────────────────────────────────── */}
        {!isPaid && (
          <>
            {/* Section header (before login) */}
            {!isAuthenticated && (
              <>
                <p className="text-center text-[#3D2E1F] font-semibold mb-4">
                  Выбор метода оплаты
                </p>
                <p className="text-xs text-[#6B5B4A] uppercase tracking-wide font-semibold mb-1">
                  Быстрая оплата
                </p>
                <p className="text-xs text-[#8B6F47] mb-3">
                  Без регистрации и входа — мгновенный переход в приложение
                  платёжной системы.
                </p>
              </>
            )}

            {/* Click / Payme / Uzum buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => handlePayment("click")}
                disabled={paying}
                className="bg-white border border-[#E8DDD0] rounded-xl p-4 flex items-center justify-center hover:border-[#00B5E2] hover:shadow-md transition-all disabled:opacity-50"
              >
                <PaymentLogo
                  src="/images/click-logo.svg"
                  alt="Click"
                  fallbackText="click"
                  fallbackColor="text-[#00B5E2]"
                />
              </button>

              <button
                onClick={() => handlePayment("payme")}
                disabled={paying}
                className="bg-white border border-[#E8DDD0] rounded-xl p-4 flex items-center justify-center hover:border-[#00CCCC] hover:shadow-md transition-all disabled:opacity-50"
              >
                <PaymentLogo
                  src="/images/payme-logo.svg"
                  alt="Payme"
                  fallbackText="payme"
                  fallbackColor="text-[#00CCCC]"
                />
              </button>

              <button
                onClick={() => handlePayment("uzum")}
                disabled={paying}
                className="bg-white border border-[#E8DDD0] rounded-xl p-4 flex items-center justify-center hover:border-[#7B2BFF] hover:shadow-md transition-all disabled:opacity-50"
              >
                <PaymentLogo
                  src="/images/uzum-logo.svg"
                  alt="Uzum"
                  fallbackText="uzum"
                  fallbackColor="text-[#7B2BFF]"
                />
              </button>
            </div>

            {/* Login to earn bonuses (before login only) */}
            {!isAuthenticated && (
              <div className="border-t border-[#E8DDD0] pt-4">
                <p className="text-xs text-[#6B5B4A] uppercase tracking-wide font-semibold mb-1">
                  Оплата с выгодой
                </p>
                <p className="text-xs text-[#8B6F47] mb-4">
                  Войдите в профиль, чтобы копить бонусы и видеть историю всех
                  заказов.
                </p>

                <button
                  onClick={handleTelegramLogin}
                  className="w-full bg-[#3D2E1F] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#2A1F14] transition-colors mb-3"
                >
                  ВОЙТИ И ОПЛАТИТЬ
                </button>

                <div className="flex gap-3">
                  <button className="flex-1 flex items-center gap-2 bg-white border border-[#E8DDD0] rounded-xl px-3 py-2 text-sm text-[#3D2E1F] hover:bg-[#F5EDE3]">
                    <span className="text-blue-500 font-bold">G</span>
                    <span className="truncate">Войти через Google</span>
                  </button>

                  <button
                    onClick={handleTelegramLogin}
                    className="flex-1 flex items-center gap-2 bg-[#0088cc] text-white rounded-xl px-3 py-2 text-sm hover:bg-[#0077b5]"
                  >
                    <span>✈️</span>
                    <span className="truncate">Войти через Telegram</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
