import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t } = useTranslation();
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
  const minimizedHeight = topSlot ? 158 : 88;
  const openHeight = desktop
    ? Math.min(available * 0.85, 680)
    : Math.min(available * 0.82, 660);

  const sheetHeight = expanded ? openHeight : minimizedHeight;
  const ready = bounds.height > 0;

  const animatedHeight = useRef(new Animated.Value(minimizedHeight)).current;
  const bottomValue = useRef(new Animated.Value(bottom)).current;
  const currentHeightRef = useRef(sheetHeight);
  const dragStartHeightRef = useRef(sheetHeight);
  const isDraggingRef = useRef(false);
  const minHRef = useRef(minimizedHeight);
  const maxHRef = useRef(openHeight);
  const expandedRef = useRef(expanded);
  const setExpandedRef = useRef(setExpanded);

  minHRef.current = minimizedHeight;
  maxHRef.current = openHeight;
  expandedRef.current = expanded;
  setExpandedRef.current = setExpanded;

  useEffect(() => {
    bottomValue.setValue(bottom);
  }, [bottom, bottomValue]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    currentHeightRef.current = sheetHeight;
    if (!ready) {
      animatedHeight.setValue(sheetHeight);
      return;
    }
    Animated.spring(animatedHeight, {
      toValue: sheetHeight,
      tension: 75,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [sheetHeight, ready, animatedHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 6 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        dragStartHeightRef.current = currentHeightRef.current;
        animatedHeight.stopAnimation((value) => {
          currentHeightRef.current = value;
          dragStartHeightRef.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const nextH = Math.max(
          minHRef.current,
          Math.min(maxHRef.current, dragStartHeightRef.current - gestureState.dy)
        );
        currentHeightRef.current = nextH;
        animatedHeight.setValue(nextH);
      },
      onPanResponderRelease: (_, gestureState) => {
        isDraggingRef.current = false;
        const range = Math.max(1, maxHRef.current - minHRef.current);
        const snapThreshold = expandedRef.current
          ? minHRef.current + range * 0.75
          : minHRef.current + range * 0.25;
        const shouldOpen =
          gestureState.vy < -0.2
            ? true
            : gestureState.vy > 0.2
            ? false
            : currentHeightRef.current > snapThreshold;

        const targetH = shouldOpen ? maxHRef.current : minHRef.current;
        currentHeightRef.current = targetH;
        Animated.spring(animatedHeight, {
          toValue: targetH,
          tension: 75,
          friction: 12,
          useNativeDriver: false,
        }).start();
        setExpandedRef.current(shouldOpen);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        const midPoint = (minHRef.current + maxHRef.current) / 2;
        const shouldOpen = currentHeightRef.current > midPoint;
        const targetH = shouldOpen ? maxHRef.current : minHRef.current;
        currentHeightRef.current = targetH;
        Animated.spring(animatedHeight, {
          toValue: targetH,
          tension: 75,
          friction: 12,
          useNativeDriver: false,
        }).start();
        setExpandedRef.current(shouldOpen);
      },
    })
  ).current;

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
      <Animated.View
        pointerEvents="auto"
        onStartShouldSetResponder={() => true}
        style={[
          styles.sheet,
          styles.overlaySheet,
          ready && {
            top: Animated.subtract(bottomValue, animatedHeight),
            height: animatedHeight,
            left: 0,
            width: Math.min(bounds.width || width, width),
          },
          !ready && styles.hidden,
        ]}
      >
        <View
          style={[styles.header, desktop && styles.desktopContent]}
          {...panResponder.panHandlers}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? t.collapseOptionsA11y : t.expandOptionsA11y
            }
            accessibilityState={{ expanded }}
            hitSlop={{ top: 8, bottom: 8, left: 24, right: 24 }}
            onPress={() => setExpanded(!expanded)}
            style={({ pressed }) => [
              styles.handlePressArea,
              pressed && styles.headerPressed,
            ]}
          >
            <View style={styles.handle} accessible={false} />
          </Pressable>

          {/* Origin (A) & Destination (B) Bar at the very top of the bottom sheet */}
          {topSlot ? <View style={styles.topSlotContainer}>{topSlot}</View> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? t.collapseOptionsA11y : t.expandOptionsA11y
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
                  {t.travelOptionsTitle}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {summaryText || t.travelOptionsDefaultSub}
                </Text>
              </View>
              <View style={styles.togglePill}>
                <Text style={styles.togglePillText}>
                  {expanded ? t.optionsCollapse : t.optionsExpand}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View
          style={styles.bodyContainer}
          pointerEvents={expanded ? 'auto' : 'none'}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        >
          <ScrollView
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.md }}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={[styles.footer, desktop && styles.desktopContent]}
              {...panResponder.panHandlers}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </Animated.View>
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
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
  },
  topSlotContainer: {
    marginBottom: 6,
  },
  summaryControl: {
    paddingTop: 6,
    paddingBottom: 12,
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
    width: 48,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.controlBorder,
    alignSelf: 'center',
  },
  bodyContainer: { flex: 1, minHeight: 0 },
  optionsList: { flex: 1, minHeight: 0 },
  footer: { flexShrink: 0 },
  desktopContent: { width: '100%', maxWidth: 960, alignSelf: 'center' },
});
