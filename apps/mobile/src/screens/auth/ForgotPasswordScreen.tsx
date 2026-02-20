/**
 * Forgot Password Screen
 * Email input, validation, password reset request
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../services/api';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) {
      return 'Введите email адрес';
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      return 'Введите корректный email адрес';
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateEmail(email);
    if (error) {
      Alert.alert('Ошибка', error);
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setIsSent(true);
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Не удалось отправить ссылку. Попробуйте позже.';
      Alert.alert('Ошибка', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (isSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="mail-open-outline" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Проверьте вашу почту</Text>
            <Text style={styles.successMessage}>
              Мы отправили ссылку для сброса пароля на{'\n'}
              <Text style={styles.emailHighlight}>{email.trim()}</Text>
            </Text>
            <Text style={styles.successHint}>
              Если письмо не пришло, проверьте папку "Спам"
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={handleBackToLogin}>
              <Ionicons name="arrow-back-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Вернуться ко входу</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                setIsSent(false);
              }}
            >
              <Text style={styles.resendText}>Отправить повторно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={32} color="#43302b" />
            </View>
            <Text style={styles.title}>Восстановление пароля</Text>
            <Text style={styles.subtitle}>
              Введите email, привязанный к вашему аккаунту. Мы отправим ссылку для сброса пароля.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Email адрес</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@mail.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
              {email.length > 0 && (
                <TouchableOpacity onPress={() => setEmail('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Отправить ссылку для сброса</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to Login */}
          <TouchableOpacity style={styles.backLink} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back-outline" size={18} color="#43302b" />
            <Text style={styles.backLinkText}>Вернуться ко входу</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#43302b15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  // Form Card
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 6,
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#43302b',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Back Link
  backLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  backLinkText: {
    color: '#43302b',
    fontSize: 14,
    fontWeight: '500',
  },

  // Success State
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  successIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#1F2937',
  },
  successHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 28,
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    color: '#43302b',
    fontSize: 14,
    fontWeight: '500',
  },
});
