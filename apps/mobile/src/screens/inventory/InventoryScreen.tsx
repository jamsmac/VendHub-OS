/**
 * Inventory Screen
 * Shows operator inventory, machine inventory, and movement history
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../services/api';

type TabKey = 'operator' | 'movements';

interface InventoryItem {
  id: string;
  productName: string;
  productSku?: string;
  currentQuantity: number;
  maxCapacity: number;
  unit: string;
  status: string;
  lastUpdated?: string;
}

interface Movement {
  id: string;
  type: 'in' | 'out' | 'transfer';
  productName: string;
  quantity: number;
  unit: string;
  fromLocation?: string;
  toLocation?: string;
  createdAt: string;
  note?: string;
}

const statusColors: Record<string, string> = {
  normal: '#10B981',
  low: '#F59E0B',
  critical: '#EF4444',
  empty: '#6B7280',
};

export function InventoryScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const machineId = route.params?.machineId;
  const [activeTab, setActiveTab] = useState<TabKey>('operator');

  const {
    data: operatorInventory,
    isLoading: loadingOperator,
    refetch: refetchOperator,
  } = useQuery({
    queryKey: ['operator-inventory'],
    queryFn: () => inventoryApi.getOperator().then((res) => res.data as InventoryItem[]),
    enabled: activeTab === 'operator',
  });

  const {
    data: movements,
    isLoading: loadingMovements,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => inventoryApi.getMovements().then((res) => res.data as Movement[]),
    enabled: activeTab === 'movements',
  });

  const isLoading = activeTab === 'operator' ? loadingOperator : loadingMovements;
  const refetch = activeTab === 'operator' ? refetchOperator : refetchMovements;

  const getStockPercent = (current: number, max: number) =>
    max > 0 ? Math.round((current / max) * 100) : 0;

  const getStockColor = (percent: number) =>
    percent < 15 ? '#EF4444' : percent < 40 ? '#F59E0B' : '#10B981';

  const getMovementIcon = (type: string): keyof typeof Ionicons.glyphMap =>
    type === 'in' ? 'arrow-down-circle' : type === 'out' ? 'arrow-up-circle' : 'swap-horizontal-outline';

  const getMovementColor = (type: string) =>
    type === 'in' ? '#10B981' : type === 'out' ? '#EF4444' : '#3B82F6';

  const renderInventoryItem = (item: InventoryItem) => {
    const percent = getStockPercent(item.currentQuantity, item.maxCapacity);
    const barColor = getStockColor(percent);

    return (
      <View key={item.id} style={styles.inventoryCard}>
        <View style={styles.inventoryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.productName}</Text>
            {item.productSku && (
              <Text style={styles.productSku}>{item.productSku}</Text>
            )}
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] || '#6B7280' }]} />
        </View>

        <View style={styles.quantityRow}>
          <Text style={styles.quantityText}>
            {item.currentQuantity} / {item.maxCapacity} {item.unit}
          </Text>
          <Text style={[styles.percentText, { color: barColor }]}>{percent}%</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBar, { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }]}
          />
        </View>

        {item.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Obnovleno: {new Date(item.lastUpdated).toLocaleDateString('ru-RU')}
          </Text>
        )}
      </View>
    );
  };

  const renderMovement = (item: Movement) => {
    const icon = getMovementIcon(item.type);
    const color = getMovementColor(item.type);
    const sign = item.type === 'in' ? '+' : item.type === 'out' ? '-' : '';
    const typeLabel = item.type === 'in' ? 'Priyom' : item.type === 'out' ? 'Rashod' : 'Transfer';

    return (
      <View key={item.id} style={styles.movementCard}>
        <View style={[styles.movementIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.movementInfo}>
          <Text style={styles.movementProduct}>{item.productName}</Text>
          <Text style={styles.movementMeta}>
            {typeLabel}
            {item.fromLocation && ` • ${item.fromLocation}`}
            {item.toLocation && ` → ${item.toLocation}`}
          </Text>
          <Text style={styles.movementDate}>
            {new Date(item.createdAt).toLocaleString('ru-RU')}
          </Text>
        </View>
        <Text style={[styles.movementQty, { color }]}>
          {sign}{item.quantity} {item.unit}
        </Text>
      </View>
    );
  };

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'operator' && styles.tabActive]}
          onPress={() => setActiveTab('operator')}
        >
          <Ionicons
            name="cube-outline"
            size={18}
            color={activeTab === 'operator' ? '#43302b' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'operator' && styles.tabTextActive]}>
            Zapasy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'movements' && styles.tabActive]}
          onPress={() => setActiveTab('movements')}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={activeTab === 'movements' ? '#43302b' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'movements' && styles.tabTextActive]}>
            Dvizheniya
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {activeTab === 'operator' && (
          <>
            {/* Summary */}
            {operatorInventory && operatorInventory.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{operatorInventory.length}</Text>
                  <Text style={styles.summaryLabel}>Tovarov</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                    {operatorInventory.filter((i) => i.status === 'critical' || i.status === 'empty').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Kritichno</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                    {operatorInventory.filter((i) => i.status === 'low').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Malo</Text>
                </View>
              </View>
            )}

            {/* Inventory List */}
            {!loadingOperator && operatorInventory && operatorInventory.length > 0
              ? operatorInventory.map(renderInventoryItem)
              : !loadingOperator && renderEmptyState('Net dannyh o zapasah')}
          </>
        )}

        {activeTab === 'movements' && (
          <>
            {!loadingMovements && movements && movements.length > 0
              ? movements.map(renderMovement)
              : !loadingMovements && renderEmptyState('Net dvizhenij tovara')}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#43302b',
  },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#43302b', fontWeight: '600' },
  content: { flex: 1, padding: 16 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Inventory
  inventoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  productSku: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quantityText: { fontSize: 13, color: '#6B7280' },
  percentText: { fontSize: 13, fontWeight: '600' },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 3 },
  lastUpdated: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  // Movements
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  movementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  movementInfo: { flex: 1 },
  movementProduct: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  movementMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  movementDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  movementQty: { fontSize: 15, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 12 },
});
