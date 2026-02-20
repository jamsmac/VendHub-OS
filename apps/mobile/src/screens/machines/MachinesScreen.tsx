/**
 * Machines Screen
 * List of operator's assigned machines
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { machinesApi } from '../../services/api';
import { MainStackParamList } from '../../navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface Machine {
  id: string;
  machineNumber: string;
  name: string;
  status: string;
  address?: string;
  lastRefillDate?: string;
  lastCollectionDate?: string;
  stockLevel?: number;
  currentCashAmount?: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  active: { label: 'Активен', color: '#10B981', icon: 'checkmark-circle' },
  low_stock: { label: 'Мало товара', color: '#F59E0B', icon: 'alert-circle' },
  error: { label: 'Ошибка', color: '#EF4444', icon: 'close-circle' },
  maintenance: { label: 'Обслуживание', color: '#3B82F6', icon: 'construct' },
  offline: { label: 'Офлайн', color: '#6B7280', icon: 'cloud-offline' },
};

export function MachinesScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: machines, isLoading, refetch } = useQuery({
    queryKey: ['my-machines'],
    queryFn: () => machinesApi.getMy().then((res) => res.data.data),
  });

  const renderMachine = ({ item }: { item: Machine }) => {
    const status = statusConfig[item.status] || statusConfig.offline;

    return (
      <TouchableOpacity
        style={styles.machineCard}
        onPress={() => navigation.navigate('MachineDetail', { machineId: item.id })}
      >
        <View style={styles.machineHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
          <View style={styles.machineInfo}>
            <Text style={styles.machineName}>{item.name}</Text>
            <Text style={styles.machineNumber}>#{item.machineNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {item.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color="#9CA3AF" />
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="battery-charging" size={16} color="#6B7280" />
            <Text style={styles.statLabel}>Запас</Text>
            <Text style={[styles.statValue, item.stockLevel !== undefined && item.stockLevel < 30 ? styles.statValueWarning : null]}>
              {item.stockLevel !== undefined ? `${item.stockLevel}%` : 'N/A'}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text style={styles.statLabel}>В кассе</Text>
            <Text style={styles.statValue}>
              {item.currentCashAmount ? `${Number(item.currentCashAmount).toLocaleString()}` : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.datesRow}>
          {item.lastRefillDate && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Пополнение:</Text>
              <Text style={styles.dateValue}>
                {new Date(item.lastRefillDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
          {item.lastCollectionDate && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Инкассация:</Text>
              <Text style={styles.dateValue}>
                {new Date(item.lastCollectionDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={machines}
        renderItem={renderMachine}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cafe-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Нет закреплённых автоматов</Text>
            <Text style={styles.emptySubtitle}>
              Автоматы появятся здесь после назначения
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
  },
  machineCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  machineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  machineNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  statValueWarning: {
    color: '#F59E0B',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flexDirection: 'row',
  },
  dateLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateValue: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});
