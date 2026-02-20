import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Ticket,
  CheckCircle,
  XCircle,
  Gift,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { promoCodesApi } from "../lib/api";

interface ValidationResult {
  valid: boolean;
  type: string;
  value: number;
  description: string;
}

export function PromoCodePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  const TYPE_LABELS: Record<
    string,
    { label: string; format: (v: number) => string }
  > = {
    fixed_discount: {
      label: t("promoTypeFixedDiscount"),
      format: (v) => `${v.toLocaleString()} ${t("currency")}`,
    },
    percent_discount: {
      label: t("promoTypePercentDiscount"),
      format: (v) => `${v}%`,
    },
    bonus_points: {
      label: t("promoTypeBonusPoints"),
      format: (v) => `+${v} ${t("pointsLabel")}`,
    },
    free_product: {
      label: t("promoTypeFreeProduct"),
      format: (v) => `${v} ${t("free")}`,
    },
  };

  const validateMutation = useMutation({
    mutationFn: (code: string) =>
      promoCodesApi.validate(code).then((r) => r.data),
    onSuccess: (data) => setResult(data),
    onError: () => {
      setResult({
        valid: false,
        type: "",
        value: 0,
        description: t("promoNotFoundOrExpired"),
      });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => promoCodesApi.redeem(code),
    onSuccess: () => {
      toast.success(t("promoActivated"));
      setCode("");
      setResult(null);
    },
    onError: () => toast.error(t("promoActivationError")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 3) return;
    setResult(null);
    validateMutation.mutate(code.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 pt-12 pb-16">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">{t("promoCodeTitle")}</h1>
        </div>
        <p className="text-sm opacity-90">{t("promoCodeSubtitle")}</p>
      </div>

      <div className="px-4 -mt-8 space-y-6 pb-24">
        {/* Input Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("promoCodeLabel")}
              </label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setResult(null);
                  }}
                  placeholder={t("promoCodePlaceholder")}
                  className="w-full pl-11 pr-4 py-3 border rounded-xl text-lg font-mono tracking-widest focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  maxLength={20}
                  autoCapitalize="characters"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={code.trim().length < 3 || validateMutation.isPending}
              className="w-full py-3 bg-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validateMutation.isPending
                ? t("promoChecking")
                : t("promoApplyButton")}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`rounded-2xl p-6 border ${result.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            {result.valid ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-green-800 mb-1">
                  {t("promoValid")}
                </h3>
                <p className="text-sm text-green-600 mb-3">
                  {result.description}
                </p>
                <div className="bg-green-100 rounded-xl py-3 px-4 mb-4">
                  <p className="text-2xl font-bold text-green-700">
                    {TYPE_LABELS[result.type]?.format(result.value) ||
                      `${result.value}`}
                  </p>
                  <p className="text-xs text-green-600">
                    {TYPE_LABELS[result.type]?.label || result.type}
                  </p>
                </div>
                <button
                  onClick={() => redeemMutation.mutate(code)}
                  disabled={redeemMutation.isPending}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Gift className="h-5 w-5" />
                  {redeemMutation.isPending
                    ? t("promoActivating")
                    : t("promoActivate")}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-red-800 mb-1">
                  {t("promoInvalidTitle")}
                </h3>
                <p className="text-sm text-red-600">{result.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="bg-white rounded-2xl p-5 border">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            {t("promoWhereToFind")}
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">&#8226;</span>
              {t("promoSourceTelegram")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">&#8226;</span>
              {t("promoSourceStickers")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">&#8226;</span>
              {t("promoSourceEmail")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">&#8226;</span>
              {t("promoSourceAchievements")}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
