/**
 * Quests Page
 * Daily/weekly challenges and achievements
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Trophy,
  Target,
  Zap,
  Star,
  Clock,
  CheckCircle2,
  Gift,
  Flame,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement' | 'special';
  category: 'purchase' | 'visit' | 'referral' | 'social' | 'streak';
  target: number;
  progress: number;
  reward: number;
  rewardType: 'points' | 'cashback' | 'discount';
  status: 'available' | 'in_progress' | 'completed' | 'claimed';
  expiresAt?: string;
  unlockedAt?: string;
}

interface Streak {
  current: number;
  longest: number;
  lastActivityDate: string;
}

const questIcons: Record<string, typeof Trophy> = {
  purchase: Target,
  visit: Zap,
  referral: Gift,
  social: Star,
  streak: Flame,
};

const questColors: Record<string, string> = {
  daily: 'from-blue-500 to-blue-600',
  weekly: 'from-purple-500 to-purple-600',
  achievement: 'from-amber-500 to-amber-600',
  special: 'from-pink-500 to-pink-600',
};

export function QuestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievements'>('daily');

  // Fetch quests
  const { data: quests, isLoading } = useQuery<Quest[]>({
    queryKey: ['quests', activeTab],
    queryFn: async () => {
      const res = await api.get(`/quests?type=${activeTab}`);
      return res.data;
    },
  });

  // Fetch streak
  const { data: streak } = useQuery<Streak>({
    queryKey: ['quests', 'streak'],
    queryFn: async () => {
      const res = await api.get('/quests/streak');
      return res.data;
    },
  });

  // Claim reward mutation
  const claimMutation = useMutation({
    mutationFn: async (questId: string) => {
      const res = await api.post(`/quests/${questId}/claim`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
      toast.success(t('pointsReceived', { count: Number(data.reward) }));
    },
    onError: () => {
      toast.error(t('failedToClaimReward'));
    },
  });

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return t('expired');

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return t('daysShort', { count: days });
    }
    return t('hoursMinutesShort', { hours, minutes });
  };

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
        <h1 className="text-xl font-bold">{t('quests')}</h1>
      </div>

      {/* Streak Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">{t('yourStreak')}</p>
            <p className="text-4xl font-bold">{t('daysCount', { count: streak?.current || 0 })}</p>
            <p className="text-white/60 text-sm mt-1">
              {t('record')}: {t('daysCount', { count: streak?.longest || 0 })}
            </p>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  i < (streak?.current || 0) % 7
                    ? 'bg-white/30'
                    : 'bg-white/10'
                }`}
              >
                {i < (streak?.current || 0) % 7 ? (
                  <Flame className="w-4 h-4" />
                ) : (
                  <span className="text-xs text-white/50">{i + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <Flame className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'daily'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('questsDaily')}
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('questsWeekly')}
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'achievements'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('questsAchievements')}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Quests List */}
      {!isLoading && (
        <div className="space-y-3">
          {quests?.map((quest) => {
            const Icon = questIcons[quest.category] || Trophy;
            const isCompleted = quest.status === 'completed' || quest.status === 'claimed';
            const canClaim = quest.status === 'completed';
            const progressPercent = Math.min(
              (quest.progress / quest.target) * 100,
              100
            );

            return (
              <div
                key={quest.id}
                className={`card-coffee overflow-hidden ${
                  quest.status === 'claimed' ? 'opacity-60' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${questColors[quest.type]}`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold line-clamp-1">{quest.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {quest.description}
                          </p>
                        </div>
                        {quest.expiresAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {getTimeRemaining(quest.expiresAt)}
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">
                            {quest.progress} / {quest.target}
                          </span>
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <Star className="w-4 h-4" />
                            +{formatNumber(quest.reward)}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-green-500'
                                : 'bg-gradient-to-r from-primary to-primary/70'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claim Button */}
                {canClaim && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => claimMutation.mutate(quest.id)}
                      disabled={claimMutation.isPending}
                      className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Gift className="w-5 h-5" />
                      {t('claimReward')}
                    </button>
                  </div>
                )}

                {quest.status === 'claimed' && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-center gap-2 py-2 text-green-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{t('claimed')}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!quests?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t('noActiveQuests')}</p>
              <p className="text-sm mt-1">{t('checkBackLaterForQuests')}</p>
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      <div className="card-coffee p-4 bg-primary/5 border border-primary/10">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{t('questsTip')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('questsTipDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
