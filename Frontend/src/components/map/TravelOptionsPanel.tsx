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
  topSlot?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  summaryText?: string;
  autoOpenKey?: string | number;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

/**
 * Collapsible bottom sheet for route planning:
 * - Always displays `topSlot` (Polazište A & Odredište B + Moja lokacija) at the top of the sheet.
 * - Minimized state keeps A & B + summary bar visible (~138px) while leaving the rest of the screen open for the map.
 * - Expanded state reveals all multimodal route cards and the trip completion button.
 */
export function TravelOptionsPanel({
  topSlot,
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

  // Minimized height shows drag handle + A/B selector (topSlot) + compact summary row
  const minimizedHeight = topSlot ? 142 : 76;
  const openHeight = desktop
    ? Math.min(available * 0.76, 560)
    : Math.min(available * 0.68, 490);

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
              styles.handlePressArea,
              pressed && styles.headerPressed,
            ]}
          >
            <View style={styles.handle} accessible={false} />
          </Pressable>

          {/* Polazište (A) & Odredište (B) Bar at the very top of the bottom sheet */}
          {topSlot ? <View style={styles.topSlotContainer}>{topSlot}</View> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Spusti opcije putovanja' : 'Podigni opcije putovanja'
            }
            onPress={() => setExpanded(!expanded)}
            style={({ pressed }) => [
              styles.summaryControl,
              pressed && styles.headerPressed,
            ]}
          >
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
                  {expanded ? 'Spusti ⌄' : 'Opcije ⌃'}
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
    paddingTop: 6,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1.5,
    borderColor: colors.border,
    ...shadows.lg,
  },
  overlaySheet: {
    position: 'absolute',
    zIndex: 30,
    elevation: 16,
    overflow: 'hidden',
  },
  header: { marginBottom: 4, flexShrink: 0 },
  handlePressArea: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  topSlotContainer: {
    marginBottom: 6,
  },
  summaryControl: {
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyMedium,
    fontSize: 14,
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
  headerPressed: { backgroundColor: colors.surfaceMuted },
  handle: {
    width: 42,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.controlBorder,
    alignSelf: 'center',
  },
  optionsList: { flex: 1, minHeight: 0 },
  footer: { flexShrink: 0 },
  desktopContent: { width: '100%', maxWidth: 960, alignSelf: 'center' },
});
