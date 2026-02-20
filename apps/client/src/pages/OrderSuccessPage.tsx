import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, Receipt, RotateCcw, Home, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { ordersApi } from "../lib/api";

export function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { t } = useTranslation();
  useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getById(orderId!).then((r) => r.data),
    enabled: !!orderId,
  });

  // Celebration effect
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f97316", "#eab308", "#22c55e"],
      });
    } catch {
      // confetti not available, skip
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center px-4 pb-24">
      {/* Success Icon */}
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <CheckCircle className="h-14 w-14 text-green-500" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {t("orderPlaced")}
      </h1>
      <p className="text-gray-500 text-center mb-6">{t("orderReadySoon")}</p>

      {/* Order Details Card */}
      {isLoading ? (
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      ) : order ? (
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("orderNumber")}</span>
            <span className="font-mono font-bold text-lg">
              {order.orderNumber}
            </span>
          </div>

          <div className="border-t pt-3 space-y-2">
            {order.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">
                  {item.productName}{" "}
                  <span className="text-gray-400">x{item.quantity}</span>
                </span>
                <span className="font-medium">
                  {item.totalPrice.toLocaleString()} {t("currency")}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">{t("orderTotal")}</span>
            <span className="font-bold text-lg text-primary-600">
              {order.totalAmount.toLocaleString()} {t("currency")}
            </span>
          </div>

          {order.paymentMethod && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t("payment")}</span>
              <span className="capitalize">{order.paymentMethod}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t("status")}</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              {order.status === "paid"
                ? t("statusPaid")
                : order.status === "preparing"
                  ? t("statusPreparing")
                  : order.status}
            </span>
          </div>

          {/* Points earned */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {t("pointsEarned")}
              </p>
              <p className="text-xs text-yellow-600">
                {t("pointsForPurchase", {
                  count: Math.floor(order.totalAmount * 0.01),
                })}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3 mt-6">
        {order && (
          <Link
            to={`/menu/${order.machineId || ""}`}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
          >
            <RotateCcw className="h-5 w-5" />
            {t("orderAgain")}
          </Link>
        )}

        <Link
          to={`/transaction/${orderId}`}
          className="w-full py-3 bg-white text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 border"
        >
          <Receipt className="h-5 w-5" />
          {t("viewReceipt")}
        </Link>

        <Link
          to="/"
          className="w-full py-3 text-gray-500 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <Home className="h-5 w-5" />
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
