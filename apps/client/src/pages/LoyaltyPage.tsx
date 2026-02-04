/**
 * Loyalty Page
 * User loyalty program - points, levels, rewards
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Gift,
  Trophy,
  Coins,
  Zap,
  Crown,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface LoyaltyData {
  points: number;
  lifetimePoints: number;
  tier: {
    id: string;
    name: string;
    level: number;
    minPoints: number;
    maxPoints: number;
    cashbackPercent: number;
    bonusMultiplier: number;
    color: string;
  };
  nextTier: {
    id: string;
    name: string;
    minPoints: number;
    cashbackPercent: number;
  } | null;
  pointsToNextTier: number;
  progressPercent: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'product' | 'cashback' | 'special';
  imageUrl?: string;
  isAvailable: boolean;
  expiresAt?: string;
}

interface PointsHistory {
  id: string;
  points: number;
  type: 'earn' | 'spend' | 'expire' | 'bonus';
  description: string;
  createdAt: string;
}

const tierIcons: Record<number, typeof Star> = {
  1: Star,
  2: Zap,
  3: Trophy,
  4: Crown,
};

const tierColors: Record<number, string> = {
  1: 'from-gray-400 to-gray-500',
  2: 'from-blue-400 to-blue-600',
  3: 'from-yellow-400 to-amber-500',
  4: 'from-purple-400 to-purple-600',
};

export function LoyaltyPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards');

  // Fetch loyalty data
  const { data: loyalty, isLoading: loyaltyLoading } = useQuery<LoyaltyData>({
    queryKey: ['loyalty'],
    queryFn: async () => {
      const res = await api.get('/loyalty/me');
      return res.data;
    },
  });

  // Fetch available rewards
  const { data: rewards } = useQuery<Reward[]>({
    queryKey: ['loyalty', 'rewards'],
    queryFn: async () => {
      const res = await api.get('/loyalty/rewards');
      return res.data;
    },
  });

  // Fetch points history
  const { data: history } = useQuery<PointsHistory[]>({
    queryKey: ['loyalty', 'history'],
    queryFn: async () => {
      const res = await api.get('/loyalty/history');
      return res.data;
    },
    enabled: activeTab === 'history',
  });

  const TierIcon = loyalty ? tierIcons[loyalty.tier.level] || Star : Star;
  const tierGradient = loyalty ? tierColors[loyalty.tier.level] || tierColors[1] : tierColors[1];

  if (loyaltyLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">{t('bonuses')}</h1>
        </div>
        <div className="h-48 rounded-3xl bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

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
        <h1 className="text-xl font-bold">{t('bonusProgram')}</h1>
      </div>

      {/* Points Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tierGradient} p-6 text-white`}>
        <div className="relative z-10">
          {/* Tier Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
            <TierIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{loyalty?.tier.name || t('tierBasic')}</span>
          </div>

          {/* Points Balance */}
          <div className="mb-6">
            <p className="text-white/80 text-sm mb-1">{t('yourPoints')}</p>
            <p className="text-4xl font-bold">
              {formatNumber(loyalty?.points || 0)}
              <span className="text-lg ml-1 font-normal text-white/80">{t('pointsLabel')}</span>
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-white/60 text-xs">{t('cashback')}</p>
              <p className="text-lg font-semibold">{loyalty?.tier.cashbackPercent || 1}%</p>
            </div>
            <div>
              <p className="text-white/60 text-xs">{t('multiplier')}</p>
              <p className="text-lg font-semibold">x{loyalty?.tier.bonusMultiplier || 1}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs">{t('totalEarned')}</p>
              <p className="text-lg font-semibold">{formatNumber(loyalty?.lifetimePoints || 0)}</p>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {loyalty?.nextTier && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/80">{t('toLevel', { name: loyalty.nextTier.name })}</span>
                <span className="font-medium">{t('pointsRemaining', { count: Number(loyalty.pointsToNextTier) })}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${loyalty.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <Sparkles className="absolute right-4 top-4 w-20 h-20 text-white/10" />
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/quests"
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{t('quests')}</p>
            <p className="text-xs text-muted-foreground">{t('earnPoints')}</p>
          </div>
        </Link>
        <Link
          to="/referrals"
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{t('friends')}</p>
            <p className="text-xs text-muted-foreground">{t('invite')}</p>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'rewards'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('rewards')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('history')}
        </button>
      </div>

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-3">
          {rewards?.map((reward) => {
            const canRedeem = (loyalty?.points || 0) >= reward.pointsCost && reward.isAvailable;

            return (
              <div
                key={reward.id}
                className={`card-coffee p-4 ${!canRedeem ? 'opacity-60' : ''}`}
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {reward.type === 'discount' && <Coins className="w-8 h-8 text-primary" />}
                    {reward.type === 'product' && <Gift className="w-8 h-8 text-primary" />}
                    {reward.type === 'cashback' && <TrendingUp className="w-8 h-8 text-primary" />}
                    {reward.type === 'special' && <Sparkles className="w-8 h-8 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{reward.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {reward.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <Star className="w-4 h-4" />
                        {formatNumber(reward.pointsCost)}
                      </div>
                      {canRedeem ? (
                        <button className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                          {t('redeem')}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Lock className="w-4 h-4" />
                          {t('unavailable')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!rewards?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('noRewardsAvailable')}</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history?.map((item) => (
            <div key={item.id} className="card-coffee p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.type === 'earn' || item.type === 'bonus'
                    ? 'bg-green-500/10'
                    : item.type === 'spend'
                    ? 'bg-blue-500/10'
                    : 'bg-red-500/10'
                }`}>
                  {item.type === 'earn' && <ArrowUpRight className="w-5 h-5 text-green-500" />}
                  {item.type === 'bonus' && <Sparkles className="w-5 h-5 text-green-500" />}
                  {item.type === 'spend' && <Gift className="w-5 h-5 text-blue-500" />}
                  {item.type === 'expire' && <Clock className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className={`font-semibold ${
                  item.points > 0 ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  {item.points > 0 ? '+' : ''}{formatNumber(item.points)}
                </div>
              </div>
            </div>
          ))}

          {!history?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('historyEmpty')}</p>
              <p className="text-sm mt-1">{t('makePurchaseToEarnPoints')}</p>
            </div>
          )}
        </div>
      )}

      {/* Tier Info */}
      <div className="card-coffee p-4">
        <h3 className="font-semibold mb-4">{t('programLevels')}</h3>
        <div className="space-y-3">
          {[
            { level: 1, nameKey: 'tierBasic', min: 0, cashback: 1 },
            { level: 2, nameKey: 'tierSilver', min: 1000, cashback: 2 },
            { level: 3, nameKey: 'tierGold', min: 5000, cashback: 5 },
            { level: 4, nameKey: 'tierPlatinum', min: 15000, cashback: 10 },
          ].map((tier) => {
            const isCurrentTier = loyalty?.tier.level === tier.level;
            const isUnlocked = (loyalty?.lifetimePoints || 0) >= tier.min;
            const Icon = tierIcons[tier.level];

            return (
              <div
                key={tier.level}
                className={`flex items-center gap-4 p-3 rounded-xl ${
                  isCurrentTier ? 'bg-primary/10 border border-primary/20' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${tierColors[tier.level]}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t(tier.nameKey)}</span>
                    {isCurrentTier && (
                      <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                        {t('yourLevel')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('fromPoints', { count: Number(tier.min) })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{tier.cashback}%</p>
                  <p className="text-xs text-muted-foreground">{t('cashback')}</p>
                </div>
                {isUnlocked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
