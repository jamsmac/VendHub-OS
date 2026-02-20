import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronDown,
  MessageCircle,
  Phone,
  Mail,
  Send,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";

export function HelpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackText, setFeedbackText] = useState("");

  const FAQ_ITEMS = [
    { q: t("helpFaq1Q"), a: t("helpFaq1A") },
    { q: t("helpFaq2Q"), a: t("helpFaq2A") },
    { q: t("helpFaq3Q"), a: t("helpFaq3A") },
    { q: t("helpFaq4Q"), a: t("helpFaq4A") },
    { q: t("helpFaq5Q"), a: t("helpFaq5A") },
    { q: t("helpFaq6Q"), a: t("helpFaq6A") },
    { q: t("helpFaq7Q"), a: t("helpFaq7A") },
    { q: t("helpFaq8Q"), a: t("helpFaq8A") },
  ];

  const feedbackMutation = useMutation({
    mutationFn: (data: { type: string; message: string }) =>
      api.post("/complaints/public/submit", {
        type: data.type,
        message: data.message,
      }),
    onSuccess: () => {
      toast.success(t("helpFeedbackSent"));
      setFeedbackText("");
    },
    onError: () => toast.error(t("helpFeedbackError")),
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">{t("helpTitle")}</h1>
        </div>
      </div>

      <div className="px-4 space-y-5 mt-4">
        {/* FAQ */}
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            {t("helpFaqTitle")}
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium pr-3">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-sm text-gray-600 border-t pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            {t("helpFeedbackTitle")}
          </h2>
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex gap-2">
              {[
                { key: "suggestion", label: t("helpFeedbackSuggestion") },
                { key: "complaint", label: t("helpFeedbackComplaint") },
                { key: "question", label: t("helpFeedbackQuestion") },
              ].map((ft) => (
                <button
                  key={ft.key}
                  onClick={() => setFeedbackType(ft.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    feedbackType === ft.key
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={t("helpFeedbackPlaceholder")}
              rows={4}
              className="w-full border rounded-xl p-3 text-sm resize-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
            />
            <button
              onClick={() =>
                feedbackMutation.mutate({
                  type: feedbackType,
                  message: feedbackText,
                })
              }
              disabled={!feedbackText.trim() || feedbackMutation.isPending}
              className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {feedbackMutation.isPending
                ? t("helpFeedbackSending")
                : t("helpFeedbackSendButton")}
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">
            {t("helpContactsTitle")}
          </h2>
          <div className="space-y-2">
            <a
              href="tel:+998901234567"
              className="flex items-center gap-3 bg-white rounded-xl p-4 border"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">+998 90 123 45 67</p>
                <p className="text-xs text-gray-500">{t("helpPhoneLabel")}</p>
              </div>
            </a>
            <a
              href="https://t.me/vendhub_support"
              className="flex items-center gap-3 bg-white rounded-xl p-4 border"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">@vendhub_support</p>
                <p className="text-xs text-gray-500">
                  {t("helpTelegramLabel")}
                </p>
              </div>
            </a>
            <a
              href="mailto:support@vendhub.uz"
              className="flex items-center gap-3 bg-white rounded-xl p-4 border"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">support@vendhub.uz</p>
                <p className="text-xs text-gray-500">{t("helpEmailLabel")}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
