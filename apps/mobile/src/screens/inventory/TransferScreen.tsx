/**
 * Transfer Screen
 * Step-based inventory transfer between machines
 * Step 1: Select source and destination machines
 * Step 2: Select products and quantities
 * Step 3: Review and confirm
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { machinesApi, inventoryApi } from '../../services/api';

interface Machine {
  id: string;
  name: string;
  machineNumber?: string;
  location?: string;
  status: string;
}

interface Product {
  id: string;
  productName: string;
  productSku?: string;
  currentQuantity: number;
  maxCapacity: number;
  unit: string;
}

interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  maxQuantity: number;
}

type Step = 1 | 2 | 3;

export function TransferScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const [step, setStep] = useState<Step>(1);
  const [fromMachineId, setFromMachineId] = useState<string | null>(null);
  const [toMachineId, setToMachineId] = useState<string | null>(null);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [note, setNote] = useState('');
  const [machineSearch, setMachineSearch] = useState('');
  const [selectingFor, setSelectingFor] = useState<'from' | 'to' | null>(null);
  const [transferNumber, setTransferNumber] = useState<string | null>(null);

  // Fetch machines
  const { data: machines, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines-list'],
    queryFn: () => machinesApi.getAll().then((res) => {
      const data = res.data;
      return (Array.isArray(data) ? data : data?.data || data?.items || []) as Machine[];
    }),
  });

  // Fetch products from source machine
  const { data: sourceProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['machine-inventory', fromMachineId],
    queryFn: () =>
      inventoryApi.getMachine(fromMachineId!).then((res) => {
        const data = res.data;
        return (Array.isArray(data) ? data : data?.data || data?.items || []) as Product[];
      }),
    enabled: !!fromMachineId && step >= 2,
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: () =>
      inventoryApi.createTransfer({
        fromMachineId: fromMachineId!,
        toMachineId: toMachineId!,
        items: transferItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        note: note.trim() || undefined,
      }),
    onSuccess: (res) => {
      const number = res.data?.transferNumber || res.data?.id || 'OK';
      setTransferNumber(String(number));
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.message || 'Не удалось создать перемещение. Попробуйте снова.';
      Alert.alert('Ошибка', message);
    },
  });

  // Derived data
  const fromMachine = machines?.find((m) => m.id === fromMachineId);
  const toMachine = machines?.find((m) => m.id === toMachineId);

  const filteredMachines = useMemo(() => {
    if (!machines) return [];
    const search = machineSearch.toLowerCase().trim();
    let filtered = machines;

    if (selectingFor === 'to' && fromMachineId) {
      filtered = filtered.filter((m) => m.id !== fromMachineId);
    }
    if (selectingFor === 'from' && toMachineId) {
      filtered = filtered.filter((m) => m.id !== toMachineId);
    }

    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          (m.machineNumber && m.machineNumber.toLowerCase().includes(search)) ||
          (m.location && m.location.toLowerCase().includes(search)),
      );
    }

    return filtered;
  }, [machines, machineSearch, selectingFor, fromMachineId, toMachineId]);

  const totalItems = transferItems.reduce((sum, item) => sum + item.quantity, 0);

  // Handlers
  const handleSelectMachine = (machine: Machine) => {
    if (selectingFor === 'from') {
      setFromMachineId(machine.id);
      // Reset products if source changed
      setTransferItems([]);
    } else {
      setToMachineId(machine.id);
    }
    setSelectingFor(null);
    setMachineSearch('');
  };

  const handleToggleProduct = (product: Product) => {
    const existing = transferItems.find((item) => item.productId === product.id);
    if (existing) {
      setTransferItems((prev) => prev.filter((item) => item.productId !== product.id));
    } else {
      setTransferItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.productName,
          quantity: 1,
          unit: product.unit,
          maxQuantity: product.currentQuantity,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setTransferItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQuantity)) }
          : item,
      ),
    );
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!fromMachineId || !toMachineId) {
        Alert.alert('Ошибка', 'Выберите откуда и куда перемещать товар');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (transferItems.length === 0) {
        Alert.alert('Ошибка', 'Выберите хотя бы один товар для перемещения');
        return;
      }
      setStep(3);
    }
  };

  const handleConfirmTransfer = () => {
    Alert.alert(
      'Подтвердить перемещение?',
      `${transferItems.length} товар(ов), ${totalItems} единиц`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Подтвердить', onPress: () => transferMutation.mutate() },
      ],
    );
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // Success state
  if (transferNumber) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Перемещение создано</Text>
          <Text style={styles.successNumber}>#{transferNumber}</Text>
          <Text style={styles.successMeta}>
            {fromMachine?.name} {'->'} {toMachine?.name}
          </Text>
          <Text style={styles.successDetail}>
            {transferItems.length} товар(ов), {totalItems} единиц
          </Text>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
            <Ionicons name="arrow-back-outline" size={20} color="#fff" />
            <Text style={styles.doneButtonText}>Готово</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Machine Selector Modal
  if (selectingFor) {
    return (
      <View style={styles.container}>
        <View style={styles.selectorHeader}>
          <TouchableOpacity
            onPress={() => {
              setSelectingFor(null);
              setMachineSearch('');
            }}
            style={styles.selectorBackButton}
          >
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.selectorTitle}>
            {selectingFor === 'from' ? 'Откуда' : 'Куда'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск автомата..."
            placeholderTextColor="#9CA3AF"
            value={machineSearch}
            onChangeText={setMachineSearch}
            autoFocus
          />
          {machineSearch.length > 0 && (
            <TouchableOpacity onPress={() => setMachineSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {loadingMachines ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#43302b" />
            <Text style={styles.loadingText}>Zagruzka...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMachines}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.machineListContent}
            renderItem={({ item }) => {
              const isSelected =
                (selectingFor === 'from' && item.id === fromMachineId) ||
                (selectingFor === 'to' && item.id === toMachineId);

              return (
                <TouchableOpacity
                  style={[styles.machineCard, isSelected && styles.machineCardSelected]}
                  onPress={() => handleSelectMachine(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.machineIconBg}>
                    <Ionicons name="cafe-outline" size={22} color="#43302b" />
                  </View>
                  <View style={styles.machineInfo}>
                    <Text style={styles.machineName}>{item.name}</Text>
                    {item.machineNumber && (
                      <Text style={styles.machineNumber}>#{item.machineNumber}</Text>
                    )}
                    {item.location && (
                      <Text style={styles.machineLocation} numberOfLines={1}>
                        {item.location}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#43302b" />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cafe-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Автоматы не найдены</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <TouchableOpacity
              style={[
                styles.stepDot,
                step >= s && styles.stepDotActive,
                step === s && styles.stepDotCurrent,
              ]}
              onPress={() => {
                if (s < step) setStep(s as Step);
              }}
              disabled={s >= step}
            >
              {step > s ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                  {s}
                </Text>
              )}
            </TouchableOpacity>
            {s < 3 && (
              <View style={[styles.stepLine, step > s && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Select Machines */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Выберите автоматы</Text>
            <Text style={styles.stepSubtitle}>
              Укажите откуда и куда перемещать товар
            </Text>

            {/* From Machine */}
            <Text style={styles.fieldLabel}>Откуда</Text>
            <TouchableOpacity
              style={[styles.selectorCard, fromMachine && styles.selectorCardSelected]}
              onPress={() => setSelectingFor('from')}
              activeOpacity={0.7}
            >
              <View style={[styles.selectorIconBg, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="arrow-up-circle-outline" size={24} color="#EF4444" />
              </View>
              {fromMachine ? (
                <View style={styles.selectorInfo}>
                  <Text style={styles.selectorName}>{fromMachine.name}</Text>
                  {fromMachine.machineNumber && (
                    <Text style={styles.selectorDetail}>#{fromMachine.machineNumber}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Выберите автомат</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Swap Button */}
            {fromMachineId && toMachineId && (
              <TouchableOpacity
                style={styles.swapButton}
                onPress={() => {
                  const temp = fromMachineId;
                  setFromMachineId(toMachineId);
                  setToMachineId(temp);
                  setTransferItems([]);
                }}
              >
                <Ionicons name="swap-vertical" size={22} color="#43302b" />
              </TouchableOpacity>
            )}

            {/* To Machine */}
            <Text style={styles.fieldLabel}>Куда</Text>
            <TouchableOpacity
              style={[styles.selectorCard, toMachine && styles.selectorCardSelected]}
              onPress={() => setSelectingFor('to')}
              activeOpacity={0.7}
            >
              <View style={[styles.selectorIconBg, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="arrow-down-circle-outline" size={24} color="#10B981" />
              </View>
              {toMachine ? (
                <View style={styles.selectorInfo}>
                  <Text style={styles.selectorName}>{toMachine.name}</Text>
                  {toMachine.machineNumber && (
                    <Text style={styles.selectorDetail}>#{toMachine.machineNumber}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Выберите автомат</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </>
        )}

        {/* Step 2: Select Products */}
        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Выберите товары</Text>
            <Text style={styles.stepSubtitle}>
              Из: {fromMachine?.name || '---'}
            </Text>

            {loadingProducts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#43302b" />
                <Text style={styles.loadingText}>Zagruzka tovarov...</Text>
              </View>
            ) : sourceProducts && sourceProducts.length > 0 ? (
              sourceProducts.map((product) => {
                const selected = transferItems.find((item) => item.productId === product.id);
                const isSelected = !!selected;

                return (
                  <View key={product.id} style={styles.productCard}>
                    <TouchableOpacity
                      style={styles.productHeader}
                      onPress={() => handleToggleProduct(product)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.productName}</Text>
                        {product.productSku && (
                          <Text style={styles.productSku}>{product.productSku}</Text>
                        )}
                        <Text style={styles.productStock}>
                          В наличии: {product.currentQuantity} {product.unit}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isSelected && (
                      <View style={styles.quantityControl}>
                        <Text style={styles.quantityLabel}>Количество:</Text>
                        <View style={styles.quantityRow}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              handleUpdateQuantity(product.id, (selected?.quantity || 1) - 1)
                            }
                          >
                            <Ionicons name="remove" size={18} color="#43302b" />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.quantityInput}
                            value={String(selected?.quantity || 1)}
                            onChangeText={(text) => {
                              const num = parseInt(text, 10);
                              if (!isNaN(num)) {
                                handleUpdateQuantity(product.id, num);
                              }
                            }}
                            keyboardType="number-pad"
                            selectTextOnFocus
                          />
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              handleUpdateQuantity(product.id, (selected?.quantity || 1) + 1)
                            }
                          >
                            <Ionicons name="add" size={18} color="#43302b" />
                          </TouchableOpacity>
                          <Text style={styles.quantityUnit}>{product.unit}</Text>
                        </View>
                        <Text style={styles.quantityMax}>
                          Максимум: {product.currentQuantity}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Нет доступных товаров</Text>
              </View>
            )}
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Подтверждение</Text>
            <Text style={styles.stepSubtitle}>Проверьте данные перемещения</Text>

            {/* Summary Card */}
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <View style={styles.confirmDirection}>
                  <View style={[styles.confirmDirIcon, { backgroundColor: '#EF444415' }]}>
                    <Ionicons name="arrow-up-circle-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.confirmDirInfo}>
                    <Text style={styles.confirmDirLabel}>Откуда</Text>
                    <Text style={styles.confirmDirValue}>{fromMachine?.name}</Text>
                  </View>
                </View>

                <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />

                <View style={styles.confirmDirection}>
                  <View style={[styles.confirmDirIcon, { backgroundColor: '#10B98115' }]}>
                    <Ionicons name="arrow-down-circle-outline" size={20} color="#10B981" />
                  </View>
                  <View style={styles.confirmDirInfo}>
                    <Text style={styles.confirmDirLabel}>Куда</Text>
                    <Text style={styles.confirmDirValue}>{toMachine?.name}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Products List */}
            <Text style={styles.confirmSectionLabel}>Товары ({transferItems.length})</Text>
            {transferItems.map((item) => (
              <View key={item.productId} style={styles.confirmProductCard}>
                <View style={styles.confirmProductIcon}>
                  <Ionicons name="cube-outline" size={20} color="#43302b" />
                </View>
                <View style={styles.confirmProductInfo}>
                  <Text style={styles.confirmProductName}>{item.productName}</Text>
                </View>
                <Text style={styles.confirmProductQty}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
            ))}

            {/* Totals */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Всего единиц</Text>
              <Text style={styles.totalValue}>{totalItems}</Text>
            </View>

            {/* Note */}
            <Text style={styles.fieldLabel}>Примечание (необязательно)</Text>
            <View style={styles.noteContainer}>
              <TextInput
                style={styles.noteInput}
                placeholder="Добавьте комментарий..."
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep((step - 1) as Step)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#43302b" />
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            step === 1 && { flex: 1 },
            transferMutation.isPending && styles.nextButtonDisabled,
          ]}
          onPress={step === 3 ? handleConfirmTransfer : handleNextStep}
          disabled={transferMutation.isPending}
          activeOpacity={0.8}
        >
          {transferMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step === 3 ? 'Создать перемещение' : 'Далее'}
              </Text>
              {step < 3 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
              {step === 3 && <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#43302b',
  },
  stepDotCurrent: {
    backgroundColor: '#43302b',
    shadowColor: '#43302b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#43302b',
  },

  // Scroll
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },

  // Field Label
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },

  // Machine Selector Card
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  selectorCardSelected: {
    borderColor: '#43302b40',
    borderStyle: 'solid',
  },
  selectorIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectorInfo: {
    flex: 1,
  },
  selectorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectorDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectorPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },

  // Swap Button
  swapButton: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#43302b15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: -8,
  },

  // Machine Selector Modal
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectorBackButton: {
    padding: 4,
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1F2937',
  },
  machineListContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  machineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  machineCardSelected: {
    backgroundColor: '#43302b08',
    borderWidth: 1.5,
    borderColor: '#43302b',
  },
  machineIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#43302b15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  machineNumber: {
    fontSize: 12,
    color: '#43302b',
    fontWeight: '500',
    marginTop: 2,
  },
  machineLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Product Card
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#43302b',
    borderColor: '#43302b',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  productSku: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Quantity Control
  quantityControl: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingLeft: 36,
  },
  quantityLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#43302b15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 60,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  quantityUnit: {
    fontSize: 13,
    color: '#6B7280',
  },
  quantityMax: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },

  // Confirm
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  confirmDirIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  confirmDirInfo: {
    flex: 1,
  },
  confirmDirLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  confirmDirValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 1,
  },
  confirmSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  confirmProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  confirmProductIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#43302b15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  confirmProductInfo: {
    flex: 1,
  },
  confirmProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  confirmProductQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#43302b',
  },

  // Total
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#43302b15',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#43302b',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#43302b',
  },

  // Note
  noteContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  noteInput: {
    fontSize: 14,
    color: '#1F2937',
    padding: 12,
    minHeight: 80,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#43302b15',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#43302b',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#43302b',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  successNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#43302b',
    marginBottom: 12,
  },
  successMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  successDetail: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 32,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#43302b',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 32,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
