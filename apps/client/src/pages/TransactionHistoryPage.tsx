/**
 * Transaction History Page
 * Shows user's purchase history
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Coffee,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';
type FilterPeriod = 'all' | 'today' | 'week' | 'month';

// Status config labels are resolved inside the component with t()
const statusConfigStatic: Record<TransactionStatus, { icon: any; color: string; labelKey: string }> = {
  completed: { icon: CheckCircle, color: 'text-green-500', labelKey: 'statusCompleted' },
  pending: { icon: Clock, color: 'text-yellow-500', labelKey: 'statusPending' },
  failed: { icon: XCircle, color: 'text-red-500', labelKey: 'statusFailed' },
  refunded: { icon: CreditCard, color: 'text-blue-500', labelKey: 'statusRefunded' },
};

export function TransactionHistoryPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', period, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period !== 'all') params.set('period', period);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api.get(`/transactions/my?${params}`);
      return res.data;
    },
  });

  const filteredTransactions = transactions?.filter((tx: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tx.machine?.name?.toLowerCase().includes(searchLower) ||
      tx.product?.name?.toLowerCase().includes(searchLower) ||
      tx.id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('purchaseHistory')}</h1>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchByNameOrId')}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: t('periodAll') },
            { value: 'today', label: t('periodToday') },
            { value: 'week', label: t('periodWeek') },
            { value: 'month', label: t('periodMonth') },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriod(item.value as FilterPeriod)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
                period === item.value
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {t('allStatuses')}
          </button>
          {Object.entries(statusConfigStatic).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key as TransactionStatus)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 transition-colors ${
                statusFilter === key
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <config.icon className={`w-3 h-3 ${config.color}`} />
              {t(config.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : filteredTransactions?.length > 0 ? (
        <div className="space-y-3">
          {filteredTransactions.map((tx: any) => {
            const statusStatic = statusConfigStatic[tx.status as TransactionStatus] || statusConfigStatic.completed;
            const StatusIcon = statusStatic.icon;

            return (
              <Link
                key={tx.id}
                to={`/transaction/${tx.id}`}
                className="card-coffee p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Product Image/Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {tx.product?.image ? (
                    <img
                      src={tx.product.image}
                      alt={tx.product.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Coffee className="w-6 h-6 text-primary" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {tx.product?.name || t('purchase')}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {tx.machine?.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold">
                        {formatCurrency(tx.amount)}
                      </p>
                      <div className="flex items-center gap-1 text-xs">
                        <StatusIcon className={`w-3 h-3 ${statusStatic.color}`} />
                        <span className={statusStatic.color}>{t(statusStatic.labelKey)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">{t('noTransactions')}</p>
          <p className="text-sm mt-1">
            {search ? t('tryDifferentSearch') : t('purchasesWillAppearHere')}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {transactions?.length > 0 && (
        <div className="card-coffee p-4 mt-6">
          <h3 className="text-sm font-medium mb-3">{t('statistics')}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {transactions.filter((tx: any) => tx.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">{t('profilePurchases')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(
                  transactions
                    .filter((tx: any) => tx.status === 'completed')
                    .reduce((sum: number, tx: any) => sum + tx.amount, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">{t('spent')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {transactions.filter((tx: any) => tx.status === 'refunded').length}
              </p>
              <p className="text-xs text-muted-foreground">{t('refundsCount')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
