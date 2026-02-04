/**
 * Machine Detail Screen
 * Shows machine details, inventory, and actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { machinesApi } from '../../services/api';

interface MachineDetail {
  id: string;
  machineNumber: string;
  name: string;
  status: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  lastRefillDate?: string;
  lastCollectionDate?: string;
  stockLevel?: number;
  currentCashAmount?: number;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  notes?: string;
}

interface InventoryItem {
  id: string;
  productName: string;
  currentQuantity: number;
  maxCapacity: number;
  unit: string;
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  active: { label: 'Aktiven', color: '#10B981', icon: 'checkmark-circle' },
  low_stock: { label: 'Malo tovara', color: '#F59E0B', icon: 'alert-circle' },
  error: { label: 'Oshibka', color: '#EF4444', icon: 'close-circle' },
  maintenance: { label: 'Obsluzhivanie', color: '#3B82F6', icon: 'construct' },
  offline: { label: 'Oflajn', color: '#6B7280', icon: 'cloud-offline' },
};

export function MachineDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const machineId = route.params?.machineId;

  const { data: machine, isLoading, refetch } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => machinesApi.getById(machineId).then((res) => res.data as MachineDetail),
    enabled: !!machineId,
  });

  const { data: inventory } = useQuery({
    queryKey: ['machine-inventory', machineId],
    queryFn: () => machinesApi.getInventory(machineId).then((res) => res.data as InventoryItem[]),
    enabled: !!machineId,
  });

  const status = statusConfig[machine?.status || 'offline'] || statusConfig.offline;

  const openMaps = () => {
    if (machine?.latitude && machine?.longitude) {
      const url = `yandexmaps://maps.yandex.ru/?pt=${machine.longitude},${machine.latitude}&z=16`;
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(
            `https://maps.google.com/?q=${machine.latitude},${machine.longitude}`
          );
        }
      });
    }
  };

  if (isLoading || !machine) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cafe-outline" size={48} color="#D1D5DB" />
        <Text style={styles.loadingText}>Zagruzka...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Ionicons name={status.icon} size={20} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={styles.machineName}>{machine.name}</Text>
        <Text style={styles.machineNumber}>#{machine.machineNumber}</Text>
        {machine.address && (
          <TouchableOpacity style={styles.addressRow} onPress={openMaps}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.addressText}>{machine.address}</Text>
            <Ionicons name="navigate-outline" size={16} color="#43302b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="battery-charging" size={24} color="#10B981" />
          <Text style={styles.statValue}>
            {machine.stockLevel !== undefined ? `${machine.stockLevel}%` : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Zapas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>
            {machine.currentCashAmount
              ? `${Number(machine.currentCashAmount).toLocaleString()}`
              : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>V kasse</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informatsiya</Text>
        <View style={styles.infoCard}>
          {machine.model && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Model'</Text>
              <Text style={styles.infoValue}>{machine.model}</Text>
            </View>
          )}
          {machine.serialNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Serijnyj nomer</Text>
              <Text style={styles.infoValue}>{machine.serialNumber}</Text>
            </View>
          )}
          {machine.installDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data ustanovki</Text>
              <Text style={styles.infoValue}>
                {new Date(machine.installDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
          {machine.lastRefillDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Popolnenie</Text>
              <Text style={styles.infoValue}>
                {new Date(machine.lastRefillDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
          {machine.lastCollectionDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inkassatsiya</Text>
              <Text style={styles.infoValue}>
                {new Date(machine.lastCollectionDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Inventory Section */}
      {inventory && inventory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zapasy</Text>
          {inventory.map((item) => {
            const percent = item.maxCapacity > 0
              ? Math.round((item.currentQuantity / item.maxCapacity) * 100)
              : 0;
            const barColor = percent < 20 ? '#EF4444' : percent < 50 ? '#F59E0B' : '#10B981';

            return (
              <View key={item.id} style={styles.inventoryItem}>
                <View style={styles.inventoryHeader}>
                  <Text style={styles.inventoryName}>{item.productName}</Text>
                  <Text style={styles.inventoryQty}>
                    {item.currentQuantity}/{item.maxCapacity} {item.unit}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
          <Ionicons name="navigate" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Marshrut</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  machineName: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  machineNumber: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  addressText: { flex: 1, fontSize: 14, color: '#6B7280' },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  inventoryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inventoryName: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  inventoryQty: { fontSize: 12, color: '#6B7280' },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 3 },
  actionsSection: { padding: 16 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#43302b',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
