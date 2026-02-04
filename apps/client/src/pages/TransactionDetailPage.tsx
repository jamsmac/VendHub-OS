/**
 * Transaction Detail Page
 * Shows full transaction details with refund option
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Coffee,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Receipt,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// Status config labels resolved via t() inside the component
const statusConfigStatic = {
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', labelKey: 'statusCompleted' },
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', labelKey: 'statusPending' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', labelKey: 'statusFailed' },
  refunded: { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10', labelKey: 'statusRefundedDetail' },
};

// Payment method labels resolved via t() inside the component
const paymentMethodKeys: Record<string, string> = {
  cash: 'paymentCash',
  card: 'paymentCard',
  payme: 'paymentPayme',
  click: 'paymentClick',
  uzum: 'paymentUzum',
  qr: 'paymentQR',
};

export function TransactionDetailPage() {
  const { id } = useParams();
  useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const res = await api.get(`/transactions/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/transactions/${id}/refund`, { reason: refundReason });
      return res.data;
    },
    onSuccess: () => {
      toast.success(t('refundRequestSent'));
      setShowRefundDialog(false);
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error(t('refundRequestFailed'));
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copied'));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">{t('transactionNotFound')}</p>
        <Link to="/transactions" className="text-primary mt-2 inline-block">
          {t('goToPurchaseHistory')}
        </Link>
      </div>
    );
  }

  const status = statusConfigStatic[transaction.status as keyof typeof statusConfigStatic] || statusConfigStatic.completed;
  const StatusIcon = status.icon;
  const canRefund = transaction.status === 'completed' && !transaction.refundedAt;
  const refundDeadline = new Date(transaction.createdAt);
  refundDeadline.setHours(refundDeadline.getHours() + 24);
  const canStillRefund = canRefund && new Date() < refundDeadline;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/transactions"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('purchaseDetails')}</h1>
      </div>

      {/* Status Banner */}
      <div className={`${status.bg} rounded-2xl p-4 flex items-center gap-3`}>
        <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
          <StatusIcon className={`w-6 h-6 ${status.color}`} />
        </div>
        <div>
          <p className={`font-semibold ${status.color}`}>{t(status.labelKey)}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(transaction.createdAt, true)}
          </p>
        </div>
      </div>

      {/* Product Card */}
      <div className="card-coffee p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {transaction.product?.image ? (
              <img
                src={transaction.product.image}
                alt={transaction.product.name}
                className="w-12 h-12 object-contain"
              />
            ) : (
              <Coffee className="w-8 h-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">
              {transaction.product?.name || t('product')}
            </h2>
            {transaction.quantity > 1 && (
              <p className="text-sm text-muted-foreground">
                × {transaction.quantity}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="card-coffee divide-y">
        {/* Transaction ID */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">{t('transactionId')}</span>
          </div>
          <button
            onClick={() => copyToClipboard(transaction.id)}
            className="flex items-center gap-2 text-sm font-mono"
          >
            {transaction.id.slice(0, 8)}...
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Machine */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">{t('machine')}</span>
          </div>
          <Link
            to={`/machine/${transaction.machine?.id}`}
            className="flex items-center gap-2 text-sm text-primary"
          >
            {transaction.machine?.name}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Payment Method */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">{t('paymentMethod')}</span>
          </div>
          <span className="text-sm">
            {paymentMethodKeys[transaction.paymentMethod] ? t(paymentMethodKeys[transaction.paymentMethod]) : transaction.paymentMethod}
          </span>
        </div>

        {/* Date */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">{t('dateAndTime')}</span>
          </div>
          <span className="text-sm">
            {formatDate(transaction.createdAt, true)}
          </span>
        </div>

        {/* External Transaction ID */}
        {transaction.externalId && (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{t('externalId')}</span>
            </div>
            <button
              onClick={() => copyToClipboard(transaction.externalId)}
              className="flex items-center gap-2 text-sm font-mono"
            >
              {transaction.externalId.slice(0, 12)}...
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Refund Info */}
      {transaction.status === 'refunded' && (
        <div className="card-coffee p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-400">
                {t('refundProcessed')}
              </p>
              {transaction.refundedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(transaction.refundedAt, true)}
                </p>
              )}
              {transaction.refundReason && (
                <p className="text-sm mt-2">
                  {t('refundReason')}: {transaction.refundReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Button */}
      {canStillRefund && (
        <div className="space-y-3">
          <button
            onClick={() => setShowRefundDialog(true)}
            className="w-full py-3 px-4 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('requestRefund')}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            {t('refundAvailableWithin24h')}
          </p>
        </div>
      )}

      {/* Problem Report */}
      {transaction.status === 'completed' && (
        <Link
          to={`/complaint/${transaction.machine?.id}?transactionId=${transaction.id}`}
          className="w-full py-3 px-4 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {t('reportProblem')}
        </Link>
      )}

      {/* Refund Dialog */}
      {showRefundDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">{t('refundRequest')}</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('refundReason')}
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t('describeRefundReason')}
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {t('refundWarning')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRefundDialog(false)}
                className="flex-1 py-3 border border-border rounded-xl font-medium"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => refundMutation.mutate()}
                disabled={!refundReason.trim() || refundMutation.isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {refundMutation.isPending ? t('sending') : t('send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
