/**
 * Avatar Component
 * User avatar with initials fallback
 */

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle, StyleProp } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle | ImageStyle>;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
};

const colors = [
  '#4F46E5',
  '#7C3AED',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
];

function getInitials(name?: string): string {
  if (!name) return '?';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name?: string): string {
  if (!name) return colors[0];
  const charCode = name.charCodeAt(0);
  return colors[charCode % colors.length];
}

export function Avatar({ source, name, size = 'md', style }: AvatarProps) {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];
  const initials = getInitials(name);
  const backgroundColor = getColorFromName(name);

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[
          styles.image,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

// Avatar group for showing multiple users
interface AvatarGroupProps {
  users: Array<{ name?: string; avatar?: string }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const dimension = sizeMap[size];
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <View style={styles.group}>
      {displayUsers.map((user, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            { marginLeft: index > 0 ? -dimension / 3 : 0 },
          ]}
        >
          <Avatar source={user.avatar} name={user.name} size={size} />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.groupItem,
            styles.remainingBadge,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              marginLeft: -dimension / 3,
            },
          ]}
        >
          <Text style={[styles.remainingText, { fontSize: fontSizeMap[size] - 2 }]}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 100,
  },
  remainingBadge: {
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
