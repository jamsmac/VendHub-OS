/**
 * ListItem Component
 * Reusable list item for various screens
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconColor?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'default' | 'card';
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  leftIconColor = '#4F46E5',
  leftElement,
  rightElement,
  showChevron = true,
  onPress,
  disabled = false,
  style,
  variant = 'default',
}: ListItemProps) {
  const content = (
    <>
      {/* Left */}
      {(leftIcon || leftElement) && (
        <View style={styles.left}>
          {leftElement || (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${leftIconColor}15` },
              ]}
            >
              <Ionicons name={leftIcon!} size={20} color={leftIconColor} />
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, disabled && styles.titleDisabled]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right */}
      <View style={styles.right}>
        {rightElement}
        {showChevron && onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9CA3AF"
            style={rightElement ? styles.chevronWithElement : undefined}
          />
        )}
      </View>
    </>
  );

  const containerStyle = [
    styles.container,
    variant === 'card' && styles.containerCard,
    disabled && styles.containerDisabled,
    style,
  ];

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

// Section header for grouped lists
interface ListSectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function ListSectionHeader({
  title,
  action,
  onAction,
}: ListSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  containerCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  left: {
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  titleDisabled: {
    color: '#9CA3AF',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  chevronWithElement: {
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
});
