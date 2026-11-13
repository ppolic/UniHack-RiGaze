import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'alert' | 'info' | 'neutral';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  icon,
  style,
}) => {
  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'success':
        return { backgroundColor: colors.successLight, borderColor: colors.success };
      case 'warning':
        return { backgroundColor: colors.warningLight, borderColor: colors.warning };
      case 'alert':
        return { backgroundColor: colors.dangerLight, borderColor: colors.danger };
      case 'info':
        return { backgroundColor: colors.infoLight, borderColor: colors.info };
      case 'neutral':
      default:
        return { backgroundColor: colors.surfaceMuted, borderColor: colors.border };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'success':
        return { color: colors.primaryDark };
      case 'warning':
        return { color: '#B45309' };
      case 'alert':
        return { color: colors.danger };
      case 'info':
        return { color: colors.secondary };
      case 'neutral':
      default:
        return { color: colors.textSecondary };
    }
  };

  return (
    <View style={[styles.badge, getContainerStyle(), style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, getTextStyle()]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    ...typography.badge,
    fontSize: 11,
  },
});
