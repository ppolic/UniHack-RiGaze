import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface TravelOptionsPanelProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Render directly inside the screen's bounded View; owns no route or trip state. */
export function TravelOptionsPanel({ children, footer }: TravelOptionsPanelProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [slot, setSlot] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const desktop = width >= 768;

  // Absolute measurements include the parent SafeAreaView's top padding, so
  // exclude that inset once below. The tab navigator already reserves the bottom
  // safe area; subtracting it here again would lift the sheet above the tab bar.
  const bottom = Math.max(insets.top, Math.min(bounds.height, height));
  const available = Math.max(0, bottom - insets.top);
  // On short/zoomed desktop viewports, reserve room for the fixed controls and
  // a small, scrollable part of a route card rather than clipping the footer.
  const desktopMinimum = headerHeight + footerHeight + spacing.md + spacing.sm + spacing['4xl'] + spacing['2xl'];
  const compactHeight = desktop
    ? Math.min(available * 0.83, Math.max(available * 0.33, desktopMinimum))
    : Math.min(available * 0.7, Math.max(slot.height, 280));
  const sheetHeight = expanded ? available * 0.83 : compactHeight;
  const ready = bounds.height > 0 && slot.width > 0;
  const headerContent = (
    <>
      <Text style={styles.title}>Opcije putovanja A ➔ B</Text>
      <Text style={styles.subtitle}>Rangirano po ekološkoj održivosti (CO₂ & bodovi)</Text>
    </>
  );

  return (
    <>
      <View
        pointerEvents="none"
        accessible={false}
        style={styles.measurement}
        onLayout={({ nativeEvent }) => {
          const { width: measuredWidth, height: measuredHeight } = nativeEvent.layout;
          setBounds({ width: measuredWidth, height: measuredHeight });
        }}
      />
      <View
        pointerEvents="none"
        accessible={false}
        style={styles.slot}
        onLayout={({ nativeEvent }) => setSlot(nativeEvent.layout)}
      />
      <View
        pointerEvents="auto"
        // Claim otherwise-empty sheet space without intercepting child presses or scrolling.
        onStartShouldSetResponder={() => true}
        style={[
          styles.sheet,
          styles.overlaySheet,
          ready && {
            top: bottom - sheetHeight,
            height: sheetHeight,
            left: slot.x,
            width: Math.min(slot.width, bounds.width, width),
          },
          !ready && styles.hidden,
        ]}
      >
        <View
          style={[styles.header, desktop && styles.desktopContent]}
          onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Smanji opcije' : 'Proširi opcije'}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={({ pressed }) => [styles.headerControl, pressed && styles.headerPressed]}
          >
            <View style={styles.handle} accessible={false} />
            {headerContent}
          </Pressable>
        </View>
        <ScrollView
          style={styles.optionsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        >
          {children}
        </ScrollView>
        <View
          style={[styles.footer, desktop && styles.desktopContent]}
          onLayout={({ nativeEvent }) => setFooterHeight(nativeEvent.layout.height)}
        >{footer}</View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  measurement: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  hidden: { display: 'none' },
  slot: { flex: 1, marginTop: -spacing.md },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    marginTop: -spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  overlaySheet: {
    position: 'absolute',
    flex: 0,
    marginTop: 0,
    zIndex: 10,
    elevation: 12,
    overflow: 'hidden',
  },
  header: { marginBottom: spacing.sm, flexShrink: 0 },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  headerControl: {
    minHeight: 44,
    justifyContent: 'center',
    paddingBottom: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  headerPressed: { backgroundColor: colors.surfaceMuted },
  handle: {
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  optionsList: { flex: 1, minHeight: 0 },
  footer: { flexShrink: 0 },
  desktopContent: { width: '100%', maxWidth: 960, alignSelf: 'center' },
});
