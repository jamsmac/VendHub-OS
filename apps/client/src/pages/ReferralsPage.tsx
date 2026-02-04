/**
 * Referrals Page
 * Invite friends and earn rewards
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Gift,
  Users,
  Copy,
  Share2,
  CheckCircle2,
  Clock,
  User,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  referralCode: string;
  referralLink: string;
}

interface Referral {
  id: string;
  referredUser: {
    firstName?: string;
    username?: string;
    photoUrl?: string;
  };
  status: 'pending' | 'active' | 'expired';
  reward: number;
  rewardClaimed: boolean;
  createdAt: string;
  activatedAt?: string;
}

interface ReferralTier {
  level: number;
  name: string;
  minReferrals: number;
  reward: number;
  bonus: string;
}

// Tier names and bonuses are localized inside the component via t() calls
const tiersData: Omit<ReferralTier, 'name' | 'bonus'>[] = [
  { level: 1, minReferrals: 0, reward: 5000 },
  { level: 2, minReferrals: 5, reward: 7500 },
  { level: 3, minReferrals: 15, reward: 10000 },
  { level: 4, minReferrals: 50, reward: 15000 },
];

export function ReferralsPage() {
  const { t } = useTranslation();
  const [showQR, setShowQR] = useState(false);

  const tierNames: Record<number, string> = {
    1: t('referralTierNewbie'),
    2: t('referralTierActivist'),
    3: t('referralTierAmbassador'),
    4: t('referralTierLegend'),
  };

  const tiers: ReferralTier[] = tiersData.map((td) => ({
    ...td,
    name: tierNames[td.level],
    bonus: t('referralBonusPerFriend', { amount: formatNumber(td.reward) }),
  }));

  // Fetch referral stats
  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ['referrals', 'stats'],
    queryFn: async () => {
      const res = await api.get('/referrals/stats');
      return res.data;
    },
  });

  // Fetch referral history
  const { data: referrals } = useQuery<Referral[]>({
    queryKey: ['referrals', 'history'],
    queryFn: async () => {
      const res = await api.get('/referrals/history');
      return res.data;
    },
  });

  const currentTier = tiers.reduce((prev, tier) => {
    if ((stats?.totalReferrals || 0) >= tier.minReferrals) return tier;
    return prev;
  }, tiers[0]);

  const nextTier = tiers.find((tierItem) => tierItem.minReferrals > (stats?.totalReferrals || 0));

  const handleCopyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      toast.success(t('codeCopied'));
    }
  };

  const handleCopyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      toast.success(t('linkCopied'));
    }
  };

  const handleShare = async () => {
    if (!stats?.referralLink) return;

    const shareData = {
      title: 'VendHub',
      text: t('referralShareText'),
      url: stats.referralLink,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled sharing
      }
    } else {
      handleCopyLink();
    }
  };

  const handleTelegramShare = () => {
    if (!stats?.referralLink) return;
    const text = encodeURIComponent(t('referralTelegramShareText'));
    const url = encodeURIComponent(stats.referralLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  if (statsLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/loyalty" className="p-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">{t('inviteFriends')}</h1>
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
          to="/loyalty"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('inviteFriends')}</h1>
      </div>

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-6 h-6" />
            <span className="font-semibold">{t('inviteFriendsAction')}</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {t('referralGetReward', { amount: formatNumber(currentTier.reward) })}
          </h2>
          <p className="text-white/80 mb-4">
            {t('referralForEachFriend')}
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-white/60 text-xs">{t('referralInvited')}</p>
              <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs">{t('referralEarned')}</p>
              <p className="text-2xl font-bold">
                {formatNumber(stats?.totalEarned || 0)}
              </p>
            </div>
          </div>
        </div>
        <Users className="absolute right-4 bottom-4 w-24 h-24 text-white/10" />
      </div>

      {/* Referral Code */}
      <div className="card-coffee p-4 space-y-4">
        <h3 className="font-semibold">{t('yourReferralCode')}</h3>

        {/* Code Display */}
        <div className="flex gap-2">
          <div className="flex-1 p-4 bg-muted rounded-xl text-center">
            <p className="text-2xl font-bold tracking-wider">
              {stats?.referralCode || 'XXXXXX'}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
          >
            <Copy className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
          >
            <QrCode className="w-6 h-6" />
          </button>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTelegramShare}
            className="flex items-center justify-center gap-2 p-3 bg-[#0088cc] text-white rounded-xl font-medium hover:bg-[#0088cc]/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Telegram
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 p-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {t('share')}
          </button>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="card-coffee p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('yourLevel')}</h3>
          <span className="text-sm text-primary font-medium">
            {currentTier.name}
          </span>
        </div>

        {nextTier && (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">
                {t('untilLevel', { level: nextTier.name })}
              </span>
              <span className="font-medium">
                {stats?.totalReferrals || 0} / {nextTier.minReferrals}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    ((stats?.totalReferrals || 0) / nextTier.minReferrals) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          {tiers.map((tier) => {
            const isUnlocked = (stats?.totalReferrals || 0) >= tier.minReferrals;
            const isCurrent = currentTier.level === tier.level;

            return (
              <div
                key={tier.level}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  isCurrent
                    ? 'bg-primary/10 border border-primary/20'
                    : isUnlocked
                    ? 'bg-muted/50'
                    : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isUnlocked ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{tier.level}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">{tier.bonus}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('referralFriendsCount', { count: tier.minReferrals })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral History */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('referralHistory')}</h3>

        {referrals?.length ? (
          <div className="space-y-2">
            {referrals.map((referral) => (
              <div key={referral.id} className="card-coffee p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {referral.referredUser.photoUrl ? (
                      <img
                        src={referral.referredUser.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {referral.referredUser.firstName ||
                        referral.referredUser.username ||
                        t('referralUser')}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      {referral.status === 'active' ? (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('referralActivated')}
                        </span>
                      ) : referral.status === 'pending' ? (
                        <span className="text-amber-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t('referralAwaitingPurchase')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t('referralExpired')}</span>
                      )}
                    </div>
                  </div>
                  {referral.status === 'active' && (
                    <div className="text-right">
                      <p className="font-semibold text-green-500">
                        +{formatNumber(referral.reward)}
                      </p>
                      <p className="text-xs text-muted-foreground">UZS</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('noReferralsYet')}</p>
            <p className="text-sm mt-1">{t('shareCodeGetReward')}</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="card-coffee p-4 space-y-4">
        <h3 className="font-semibold">{t('howItWorks')}</h3>
        <div className="space-y-3">
          {[
            { step: 1, text: t('referralStep1') },
            { step: 2, text: t('referralStep2') },
            { step: 3, text: t('referralStep3') },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {item.step}
              </div>
              <p className="text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-background rounded-3xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-center">{t('referralQRCode')}</h3>
            <div className="aspect-square bg-white rounded-2xl p-4 flex items-center justify-center">
              {/* QR Code would be generated here */}
              <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {t('showQRToFriend')}
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full py-3 border border-border rounded-xl font-medium hover:bg-muted/50 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
