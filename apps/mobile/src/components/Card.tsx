/**
 * Card Component
 * Reusable card container
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.cardElevated,
    variant === 'outlined' && styles.cardOutlined,
    padding === 'none' && styles.paddingNone,
    padding === 'sm' && styles.paddingSm,
    padding === 'md' && styles.paddingMd,
    padding === 'lg' && styles.paddingLg,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardElevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardOutlined: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: 12,
  },
  paddingMd: {
    padding: 16,
  },
  paddingLg: {
    padding: 20,
  },
});
