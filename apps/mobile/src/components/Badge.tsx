/**
 * Badge Component
 * Status and count badges
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
}

const variantColors = {
  default: { bg: '#F3F4F6', text: '#374151' },
  primary: { bg: '#EEF2FF', text: '#4F46E5' },
  success: { bg: '#D1FAE5', text: '#059669' },
  warning: { bg: '#FEF3C7', text: '#D97706' },
  danger: { bg: '#FEE2E2', text: '#DC2626' },
  info: { bg: '#DBEAFE', text: '#2563EB' },
};

const sizeStyles = {
  sm: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
  md: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 12 },
  lg: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 14 },
};

export function Badge({
  text,
  variant = 'default',
  size = 'md',
  dot = false,
  style,
}: BadgeProps) {
  const colors = variantColors[variant];
  const sizing = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: sizing.paddingHorizontal,
          paddingVertical: sizing.paddingVertical,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.text },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: sizing.fontSize,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// Count badge for notifications
interface CountBadgeProps {
  count: number;
  maxCount?: number;
  style?: ViewStyle;
}

export function CountBadge({ count, maxCount = 99, style }: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View style={[styles.countBadge, style]}>
      <Text style={styles.countText}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontWeight: '500',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
