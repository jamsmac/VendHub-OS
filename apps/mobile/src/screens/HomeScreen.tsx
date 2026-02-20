/**
 * Home Screen
 * Dashboard for operator
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { reportsApi, tasksApi } from '../services/api';
import { MainStackParamList } from '../navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface StatCard {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportsApi.getDashboard().then((res) => res.data.data),
  });

  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => tasksApi.getMy().then((res) => res.data.data),
  });

  const activeTasks = myTasks?.filter((t: any) =>
    ['assigned', 'in_progress'].includes(t.status)
  ).length || 0;

  const statCards: StatCard[] = [
    {
      title: 'Активные задачи',
      value: activeTasks,
      icon: 'clipboard',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
    },
    {
      title: 'Мои автоматы',
      value: stats?.myMachines || 0,
      icon: 'cafe',
      color: '#059669',
      bgColor: '#ECFDF5',
    },
    {
      title: 'Выполнено сегодня',
      value: stats?.completedToday || 0,
      icon: 'checkmark-circle',
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      title: 'Просрочено',
      value: stats?.overdue || 0,
      icon: 'alert-circle',
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
  ];

  const quickActions = [
    {
      title: 'Мои задачи',
      icon: 'clipboard-outline',
      onPress: () => navigation.navigate('HomeTabs'),
    },
    {
      title: 'Сканировать QR',
      icon: 'qr-code-outline',
      onPress: () => {},
    },
    {
      title: 'Уведомления',
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      title: 'Мой склад',
      icon: 'cube-outline',
      onPress: () => navigation.navigate('Inventory', {}),
    },
  ];

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Владелец',
      admin: 'Администратор',
      manager: 'Менеджер',
      operator: 'Оператор',
      warehouse: 'Склад',
      accountant: 'Бухгалтер',
      viewer: 'Наблюдатель',
    };
    return labels[role] || role;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.greeting}>Привет, {user?.firstName}! 👋</Text>
          <Text style={styles.role}>{getRoleLabel(user?.role || '')}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#4F46E5" />
          {(stats?.unreadNotifications || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats?.unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <View key={index} style={[styles.statCard, { backgroundColor: stat.bgColor }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Быстрые действия</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.onPress}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name={action.icon as any} size={28} color="#4F46E5" />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Tasks */}
      <Text style={styles.sectionTitle}>Ближайшие задачи</Text>
      {myTasks?.slice(0, 3).map((task: any) => (
        <TouchableOpacity
          key={task.id}
          style={styles.taskCard}
          onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        >
          <View style={styles.taskTypeIcon}>
            <Ionicons
              name={
                task.taskType === 'refill'
                  ? 'battery-charging'
                  : task.taskType === 'collection'
                  ? 'cash'
                  : 'construct'
              }
              size={24}
              color="#4F46E5"
            />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>
              {task.taskType === 'refill'
                ? 'Пополнение'
                : task.taskType === 'collection'
                ? 'Инкассация'
                : 'Ремонт'}
            </Text>
            <Text style={styles.taskSubtitle}>{task.machine?.name || 'Автомат'}</Text>
          </View>
          <View style={styles.taskStatus}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    task.status === 'in_progress'
                      ? '#F59E0B'
                      : task.status === 'assigned'
                      ? '#3B82F6'
                      : '#6B7280',
                },
              ]}
            />
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      ))}

      {(!myTasks || myTasks.length === 0) && (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
          <Text style={styles.emptyText}>Нет активных задач</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  role: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  actionCard: {
    width: '22%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  taskSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  bottomSpacer: {
    height: 24,
  },
});
