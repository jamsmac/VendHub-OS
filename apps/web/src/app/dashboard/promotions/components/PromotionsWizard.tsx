"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Gift,
  Percent,
  Plus,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WizardForm {
  type: string;
  title: string;
  discountValue: number;
  minOrderAmount: number;
  maxUsage: number;
  endDate: string;
  targetingOption: string;
}

interface PromotionsWizardProps {
  onCreatePromotion?: (form: WizardForm) => Promise<void>;
  onCancel?: () => void;
}

export function PromotionsWizard({
  onCreatePromotion,
  onCancel,
}: PromotionsWizardProps) {
  const t = useTranslations("promotions");
  const [wizardStep, setWizardStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardForm, setWizardForm] = useState<WizardForm>({
    type: "",
    title: "",
    discountValue: 0,
    minOrderAmount: 0,
    maxUsage: 1000,
    endDate: "",
    targetingOption: "all",
  });

  const handleCreate = async () => {
    if (!onCreatePromotion) return;

    try {
      setIsLoading(true);
      await onCreatePromotion(wizardForm);
      // Reset form
      setWizardForm({
        type: "",
        title: "",
        discountValue: 0,
        minOrderAmount: 0,
        maxUsage: 1000,
        endDate: "",
        targetingOption: "all",
      });
      setWizardStep(1);
    } catch {
      // Error is propagated to the caller via the rejected promise
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("wizardTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => setWizardStep(step)}
                className={`h-10 w-10 rounded-full p-0 ${
                  wizardStep === step
                    ? "bg-espresso text-white hover:bg-espresso-dark"
                    : wizardStep > step
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-espresso-50 text-espresso-light"
                }`}
              >
                {wizardStep > step ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step
                )}
              </Button>
              {step < 4 && (
                <div
                  className={`mx-2 h-0.5 w-12 ${wizardStep > step ? "bg-emerald-500" : "bg-espresso-50"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Type selection */}
        {wizardStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-espresso-dark mb-4">
              {t("wizardSelectType")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  type: "discount",
                  label: t("wizardTypeDiscount"),
                  icon: Percent,
                  description: t("wizardTypeDiscountDesc"),
                },
                {
                  type: "bundle",
                  label: t("wizardTypeBundle"),
                  icon: Gift,
                  description: t("wizardTypeBundleDesc"),
                },
                {
                  type: "happy_hour",
                  label: t("wizardTypeHappyHour"),
                  icon: Clock,
                  description: t("wizardTypeHappyHourDesc"),
                },
                {
                  type: "seasonal",
                  label: t("wizardTypeSeasonal"),
                  icon: Sparkles,
                  description: t("wizardTypeSeasonalDesc"),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.type}
                    variant="outline"
                    onClick={() =>
                      setWizardForm({ ...wizardForm, type: item.type })
                    }
                    className={`h-auto p-4 border-2 text-left group ${
                      wizardForm.type === item.type
                        ? "border-espresso-dark bg-espresso-50"
                        : "border-espresso-light/30 hover:border-espresso-dark"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-espresso-50 p-2 group-hover:bg-espresso-100">
                        <Icon className="h-5 w-5 text-espresso-dark" />
                      </div>
                      <div>
                        <p className="font-semibold text-espresso-dark">
                          {item.label}
                        </p>
                        <p className="text-xs text-espresso-light mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-espresso-dark mb-4">
              {t("wizardConfig")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-2">
                {t("wizardName")}
              </label>
              <Input
                placeholder={t("wizardNamePlaceholder")}
                value={wizardForm.title}
                onChange={(e) =>
                  setWizardForm({ ...wizardForm, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-espresso-dark mb-2">
                  {t("wizardDiscount")}
                </label>
                <Input
                  type="number"
                  placeholder="20"
                  value={wizardForm.discountValue}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      discountValue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-espresso-dark mb-2">
                  {t("wizardMinOrder")}
                </label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={wizardForm.minOrderAmount}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      minOrderAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-espresso-dark mb-2">
                  {t("wizardMaxUsage")}
                </label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={wizardForm.maxUsage}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      maxUsage: parseFloat(e.target.value) || 1000,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-espresso-dark mb-2">
                  {t("wizardValidity")}
                </label>
                <Input
                  type="date"
                  value={wizardForm.endDate}
                  onChange={(e) =>
                    setWizardForm({ ...wizardForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Targeting */}
        {wizardStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-espresso-dark mb-4">
              {t("wizardTargeting")}
            </h3>
            <div className="space-y-3">
              {[
                { label: t("wizardTargetAll"), value: "all" },
                { label: t("wizardTargetLevel"), value: "level" },
                { label: t("wizardTargetSegment"), value: "segment" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border border-espresso-light/30 rounded-lg cursor-pointer hover:bg-espresso-50"
                >
                  <input
                    type="radio"
                    name="targeting"
                    value={option.value}
                    className="w-4 h-4"
                    checked={wizardForm.targetingOption === option.value}
                    onChange={(e) =>
                      setWizardForm({
                        ...wizardForm,
                        targetingOption: e.target.value,
                      })
                    }
                  />
                  <span className="font-medium text-espresso-dark">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {wizardStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-espresso-dark mb-4">
              {t("wizardPreview")}
            </h3>
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-wider opacity-80">
                ☀️ УТРО
              </p>
              <p className="mt-2 text-xl font-bold">Утренний кофе -20%</p>
              <p className="mt-2 text-sm opacity-80">
                Скидка 20% на все напитки до 10:00
              </p>
              <div className="mt-4 inline-block rounded-lg bg-white/20 px-3 py-1 font-mono text-sm font-bold">
                MORNING20
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
            disabled={wizardStep === 1}
          >
            {t("wizardBack")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              {t("wizardCancel")}
            </Button>
            {wizardStep === 4 ? (
              <Button
                className="gap-2 bg-espresso hover:bg-espresso-dark"
                onClick={handleCreate}
                disabled={isLoading || !wizardForm.title}
              >
                <Plus className="h-4 w-4" /> {t("wizardCreate")}
              </Button>
            ) : (
              <Button
                className="gap-2 bg-espresso hover:bg-espresso-dark"
                onClick={() => setWizardStep(wizardStep + 1)}
              >
                {t("wizardNext")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
