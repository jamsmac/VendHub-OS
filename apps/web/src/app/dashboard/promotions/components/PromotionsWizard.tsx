"use client";

import { useState } from "react";
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
    } catch (error) {
      console.error("Error creating promotion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Создание новой акции</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => setWizardStep(step)}
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-colors ${
                  wizardStep === step
                    ? "bg-espresso text-white"
                    : wizardStep > step
                      ? "bg-emerald-500 text-white"
                      : "bg-espresso-50 text-espresso-light"
                }`}
              >
                {wizardStep > step ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step
                )}
              </button>
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
              Выберите тип акции
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  type: "discount",
                  label: "Скидка",
                  icon: Percent,
                  description: "Процент или фиксированная сумма",
                },
                {
                  type: "bundle",
                  label: "Комбо",
                  icon: Gift,
                  description: "Несколько товаров по цене одного",
                },
                {
                  type: "happy_hour",
                  label: "Happy Hour",
                  icon: Clock,
                  description: "Специальная цена в определённое время",
                },
                {
                  type: "seasonal",
                  label: "Сезонная",
                  icon: Sparkles,
                  description: "К празднику или событию",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() =>
                      setWizardForm({ ...wizardForm, type: item.type })
                    }
                    className={`p-4 border-2 rounded-lg transition-colors text-left group ${
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
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-espresso-dark mb-4">
              Конфигурация
            </h3>
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-2">
                Название
              </label>
              <Input
                placeholder="е.г. Утренняя скидка 20%"
                value={wizardForm.title}
                onChange={(e) =>
                  setWizardForm({ ...wizardForm, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-espresso-dark mb-2">
                  Скидка (%)
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
                  Мин. сумма заказа
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
                  Макс. использований
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
                  Срок действия
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
              Таргетирование
            </h3>
            <div className="space-y-3">
              {[
                { label: "Все пользователи", value: "all" },
                { label: "По уровню лояльности", value: "level" },
                { label: "По сегменту", value: "segment" },
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
              Превью
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
            Назад
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Отмена
            </Button>
            {wizardStep === 4 ? (
              <Button
                className="gap-2 bg-espresso hover:bg-espresso-dark"
                onClick={handleCreate}
                disabled={isLoading || !wizardForm.title}
              >
                <Plus className="h-4 w-4" /> Создать акцию
              </Button>
            ) : (
              <Button
                className="gap-2 bg-espresso hover:bg-espresso-dark"
                onClick={() => setWizardStep(wizardStep + 1)}
              >
                Далее
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
