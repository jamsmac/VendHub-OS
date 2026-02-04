/**
 * Button Component
 * Reusable button with variants
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles = {
  primary: {
    bg: '#4F46E5',
    bgPressed: '#4338CA',
    text: '#FFFFFF',
    border: 'transparent',
  },
  secondary: {
    bg: '#E5E7EB',
    bgPressed: '#D1D5DB',
    text: '#374151',
    border: 'transparent',
  },
  outline: {
    bg: 'transparent',
    bgPressed: '#F3F4F6',
    text: '#4F46E5',
    border: '#4F46E5',
  },
  ghost: {
    bg: 'transparent',
    bgPressed: '#F3F4F6',
    text: '#4F46E5',
    border: 'transparent',
  },
  danger: {
    bg: '#EF4444',
    bgPressed: '#DC2626',
    text: '#FFFFFF',
    border: 'transparent',
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    borderRadius: 8,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    borderRadius: 12,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 18,
    borderRadius: 14,
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const colors = variantStyles[variant];
  const sizing = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: sizing.paddingVertical,
          paddingHorizontal: sizing.paddingHorizontal,
          borderRadius: sizing.borderRadius,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={colors.text}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              {
                color: colors.text,
                fontSize: sizing.fontSize,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
});
