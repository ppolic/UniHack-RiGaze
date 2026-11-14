import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface TravelOptionsPanelProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  summaryText?: string;
  autoOpenKey?: string | number;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

/**
 * Collapsible bottom sheet for route options:
 * - Minimized (default while exploring map): compact 78px bar at the very bottom so the map is full-screen.
 * - Open: expands to show multimodal route cards and the "Odaberi i završi" action button.
 */
export function TravelOptionsPanel({
  children,
  footer,
  summaryText,
  autoOpenKey,
  isOpen,
  onToggleOpen,
}: TravelOptionsPanelProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [internalExpanded, setInternalExpanded] = useState(false);

  const expanded = isOpen !== undefined ? isOpen : internalExpanded;
  const setExpanded = (next: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(next);
    } else {
      setInternalExpanded(next);
    }
  };

  useEffect(() => {
    if (autoOpenKey !== undefined && autoOpenKey !== '') {
      setExpanded(true);
    }
  }, [autoOpenKey]);

  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const desktop = width >= 768;

  const bottom = Math.max(insets.top, Math.min(bounds.height || height, height));
  const available = Math.max(0, bottom - insets.top);

  // Minimized height leaves ~85% of the screen completely open for the full-screen map
  const minimizedHeight = 76;
  const openHeight = desktop
    ? Math.min(available * 0.72, 520)
    : Math.min(available * 0.62, 430);

  const sheetHeight = expanded ? openHeight : minimizedHeight;
  const ready = bounds.height > 0;

  return (
    <>
      <View
        pointerEvents="none"
        accessible={false}
        style={styles.measurement}
        onLayout={({ nativeEvent }) => {
          const { width: measuredWidth, height: measuredHeight } =
            nativeEvent.layout;
          setBounds({ width: measuredWidth, height: measuredHeight });
        }}
      />
      <View
        pointerEvents="auto"
        onStartShouldSetResponder={() => true}
        style={[
          styles.sheet,
          styles.overlaySheet,
          ready && {
            top: bottom - sheetHeight,
            height: sheetHeight,
            left: 0,
            width: Math.min(bounds.width || width, width),
          },
          !ready && styles.hidden,
        ]}
      >
        <View style={[styles.header, desktop && styles.desktopContent]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Spusti opcije putovanja' : 'Podigni opcije putovanja'
            }
            accessibilityState={{ expanded }}
            onPress={() => setExpanded(!expanded)}
            style={({ pressed }) => [
              styles.headerControl,
              pressed && styles.headerPressed,
            ]}
          >
            <View style={styles.handle} accessible={false} />
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  Opcije putovanja A ➔ B
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {summaryText ||
                    'Rangirano po ekološkoj održivosti (CO₂ & bodovi)'}
                </Text>
              </View>
              <View style={styles.togglePill}>
                <Text style={styles.togglePillText}>
                  {expanded ? 'Spusti ⌄' : 'Prikaži ⌃'}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {expanded && (
          <>
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.md }}
            >
              {children}
            </ScrollView>
            {footer ? (
              <View style={[styles.footer, desktop && styles.desktopContent]}>
                {footer}
              </View>
            ) : null}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  measurement: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  hidden: { display: 'none' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  overlaySheet: {
    position: 'absolute',
    zIndex: 30,
    elevation: 16,
    overflow: 'hidden',
  },
  header: { marginBottom: spacing.xs, flexShrink: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyMedium,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  togglePill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  togglePillText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  headerControl: {
    minHeight: 54,
    justifyContent: 'center',
    paddingBottom: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  headerPressed: { backgroundColor: colors.surfaceMuted },
  handle: {
    width: 42,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.controlBorder,
    alignSelf: 'center',
    marginBottom: 6,
  },
  optionsList: { flex: 1, minHeight: 0 },
  footer: { flexShrink: 0 },
  desktopContent: { width: '100%', maxWidth: 960, alignSelf: 'center' },
});
