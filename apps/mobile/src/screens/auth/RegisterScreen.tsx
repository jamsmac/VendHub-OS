/**
 * Register Screen
 * User registration form with validation
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = 'Введите имя';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      newErrors.email = 'Некорректный email адрес';
    }

    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim().replace(/[\s()-]/g, ''))) {
      newErrors.phone = 'Некорректный номер телефона';
    }

    if (!form.password) {
      newErrors.password = 'Введите пароль';
    } else if (form.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await authApi.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });

      Alert.alert(
        'Регистрация успешна',
        'Ваш аккаунт создан. Войдите с вашими данными.',
        [
          {
            text: 'Войти',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Не удалось зарегистрироваться. Попробуйте позже.';
      Alert.alert('Ошибка регистрации', message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputField = (
    field: keyof FormData,
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    options: {
      placeholder: string;
      keyboardType?: TextInput['props']['keyboardType'];
      autoCapitalize?: TextInput['props']['autoCapitalize'];
      secureTextEntry?: boolean;
      ref?: React.RefObject<TextInput>;
      onSubmitEditing?: () => void;
      returnKeyType?: TextInput['props']['returnKeyType'];
      required?: boolean;
    },
  ) => {
    const hasError = !!errors[field];

    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.inputLabel}>
          {label}
          {options.required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        <View style={[styles.inputContainer, hasError && styles.inputContainerError]}>
          <Ionicons name={icon} size={20} color={hasError ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
          <TextInput
            ref={options.ref}
            style={styles.input}
            placeholder={options.placeholder}
            placeholderTextColor="#9CA3AF"
            value={form[field]}
            onChangeText={(value) => updateField(field, value)}
            keyboardType={options.keyboardType || 'default'}
            autoCapitalize={options.autoCapitalize ?? 'sentences'}
            autoCorrect={false}
            secureTextEntry={options.secureTextEntry && !showPassword}
            editable={!isLoading}
            returnKeyType={options.returnKeyType || 'next'}
            onSubmitEditing={options.onSubmitEditing}
            blurOnSubmit={false}
          />
          {field === 'password' && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors[field]}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconWrapper}>
              <Ionicons name="cafe" size={32} color="#fff" />
            </View>
            <Text style={styles.brandName}>VendHub</Text>
            <Text style={styles.headerSubtitle}>Создайте аккаунт</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                {renderInputField('firstName', 'Имя', 'person-outline', {
                  placeholder: 'Иван',
                  autoCapitalize: 'words',
                  onSubmitEditing: () => lastNameRef.current?.focus(),
                  required: true,
                })}
              </View>
              <View style={styles.nameField}>
                {renderInputField('lastName', 'Фамилия', 'person-outline', {
                  placeholder: 'Иванов',
                  autoCapitalize: 'words',
                  ref: lastNameRef,
                  onSubmitEditing: () => emailRef.current?.focus(),
                })}
              </View>
            </View>

            {renderInputField('email', 'Email', 'mail-outline', {
              placeholder: 'ivan@example.com',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              ref: emailRef,
              onSubmitEditing: () => phoneRef.current?.focus(),
              required: true,
            })}

            {renderInputField('phone', 'Телефон', 'call-outline', {
              placeholder: '+998 90 123 45 67',
              keyboardType: 'phone-pad',
              autoCapitalize: 'none',
              ref: phoneRef,
              onSubmitEditing: () => passwordRef.current?.focus(),
            })}

            {renderInputField('password', 'Пароль', 'lock-closed-outline', {
              placeholder: 'Минимум 6 символов',
              secureTextEntry: true,
              autoCapitalize: 'none',
              ref: passwordRef,
              returnKeyType: 'done',
              onSubmitEditing: handleRegister,
              required: true,
            })}

            {/* Password hint */}
            <View style={styles.passwordHints}>
              <View style={styles.hintRow}>
                <Ionicons
                  name={form.password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={form.password.length >= 6 ? '#10B981' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.hintText,
                    form.password.length >= 6 && styles.hintTextValid,
                  ]}
                >
                  Не менее 6 символов
                </Text>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Уже есть аккаунт? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Войдите</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#43302b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
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
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },

  // Field
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputContainerError: {
    borderColor: '#EF444440',
    backgroundColor: '#FEF2F215',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },

  // Password Hints
  passwordHints: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  hintTextValid: {
    color: '#10B981',
  },

  // Register Button
  registerButton: {
    backgroundColor: '#43302b',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#43302b',
    fontSize: 14,
    fontWeight: '600',
  },
});
