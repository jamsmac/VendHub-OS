"use client";

import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  error: unknown;
}

export function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  error,
}: TransactionFormModalProps) {
  const t = useTranslations("finance");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("txFormTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-1">
                {t("txFormType")}
              </label>
              <select
                name="type"
                defaultValue="income"
                className="w-full rounded-lg border border-espresso/20 px-3 py-2 text-sm"
                required
              >
                <option value="income">{t("txFormIncome")}</option>
                <option value="expense">{t("txFormExpense")}</option>
                <option value="transfer">{t("txFormTransfer")}</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-1">
                {t("txFormCategory")}
              </label>
              <input
                type="text"
                name="category"
                placeholder={t("txFormCategoryPlaceholder")}
                className="w-full rounded-lg border border-espresso/20 px-3 py-2 text-sm"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-1">
                {t("txFormDescription")}
              </label>
              <input
                type="text"
                name="description"
                placeholder={t("txFormDescPlaceholder")}
                className="w-full rounded-lg border border-espresso/20 px-3 py-2 text-sm"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-1">
                {t("txFormAmount")}
              </label>
              <input
                type="number"
                name="amount"
                placeholder="0"
                className="w-full rounded-lg border border-espresso/20 px-3 py-2 text-sm"
                step="1000"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-1">
                {t("txFormPaymentMethod")}
              </label>
              <select
                name="payment_method"
                className="w-full rounded-lg border border-espresso/20 px-3 py-2 text-sm"
              >
                <option value="">{t("txFormNotSpecified")}</option>
                <option value="cash">{t("txFormCash")}</option>
                <option value="payme">Payme</option>
                <option value="click">Click</option>
                <option value="uzum">Uzum</option>
                <option value="humo">HUMO</option>
                <option value="uzcard">UZCARD</option>
                <option value="transfer">{t("txFormTransferPayment")}</option>
              </select>
            </div>

            {/* Hidden fields for optional data */}
            <input type="hidden" name="counterparty_id" value="" />
            <input type="hidden" name="counterparty_name" value="" />
            <input type="hidden" name="machine_id" value="" />

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isPending}
              >
                {t("txFormCancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-espresso hover:bg-espresso-dark"
                disabled={isPending}
              >
                {isPending ? t("txFormCreating") : t("txFormCreate")}
              </Button>
            </div>

            {!!error && (
              <p className="text-sm text-red-500">
                {t("txFormError")}: {String(error)}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
