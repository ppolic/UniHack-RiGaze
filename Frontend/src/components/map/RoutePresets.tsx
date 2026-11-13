import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GeoPoint } from '../../types/route';

export interface RoutePresetItem {
  id: string;
  label: string;
  originName: string;
  destinationName: string;
  origin: GeoPoint;
  destination: GeoPoint;
}

export const DEMO_PRESETS: RoutePresetItem[] = [
  {
    id: 'pr_1',
    label: 'Centar ➔ UPT Politehnica',
    originName: 'Piața Victoriei',
    destinationName: 'UPT Electro',
    origin: { lat: 45.7538, lng: 21.2257 },
    destination: { lat: 45.7489, lng: 21.2272 },
  },
  {
    id: 'pr_2',
    label: 'Gara de Nord ➔ Iulius Mall',
    originName: 'Gara de Nord',
    destinationName: 'Iulius Town',
    origin: { lat: 45.7505, lng: 21.2078 },
    destination: { lat: 45.7661, lng: 21.2285 },
  },
  {
    id: 'pr_3',
    label: 'Piața Unirii ➔ Complex Studențesc',
    originName: 'Piața Unirii',
    destinationName: 'Complex Studențesc',
    origin: { lat: 45.7577, lng: 21.2289 },
    destination: { lat: 45.7471, lng: 21.2415 },
  },
];

interface RoutePresetsProps {
  onSelectPreset: (preset: RoutePresetItem) => void;
  activePresetId?: string;
}

export const RoutePresets: React.FC<RoutePresetsProps> = ({
  onSelectPreset,
  activePresetId,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {DEMO_PRESETS.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <TouchableOpacity
            key={preset.id}
            onPress={() => onSelectPreset(preset)}
            style={[styles.chip, isActive && styles.activeChip]}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, isActive && styles.activeChipText]}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  activeChipText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
