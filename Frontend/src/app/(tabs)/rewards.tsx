import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PointsSummaryCard } from '../../components/rewards/PointsSummaryCard';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { Badge } from '../../components/common/Badge';
import { rewardsService } from '../../services/rewardsService';
import { fe2ErrorMessage } from '../../services/fe2Session';
import { RewardCoupon, RewardRedemption } from '../../types/rewards';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../store/userStore';
import { getTranslations, useTranslation } from '../../hooks/useTranslation';

type Resource<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T };
type ConfirmedRedemption = RewardRedemption & { title: string };

function useFocusedData<T>(load: () => Promise<T>, version: number, userId?: string, token?: string | null) {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });
  const { language } = useTranslation();
  useFocusEffect(useCallback(() => {
    let active = true;
    setState({ status: 'loading' });
    void load().then((data) => {
      if (active) setState({ status: 'success', data });
    }).catch((error: unknown) => {
      if (active) setState({ status: 'error', message: fe2ErrorMessage(error, getTranslations().rewardsDataLoadError) });
    });
    return () => { active = false; };
  }, [load, version, userId, token, language]));
  return [state, setState] as const;
}

// Date-only rewards remain valid through the end of the device's local day.
function expiryError(expiryDate?: string): string | null {
  if (!expiryDate) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(expiryDate);
  const expiry = new Date(dateOnly ? `${expiryDate}T00:00:00` : expiryDate);
  if (!Number.isFinite(expiry.getTime())) return getTranslations().rewardsExpiryCheckFailed;
  if (dateOnly) {
    const [year, month, day] = expiryDate.split('-').map(Number);
    if (expiry.getFullYear() !== year || expiry.getMonth() + 1 !== month || expiry.getDate() !== day) {
      return getTranslations().rewardsExpiryCheckFailed;
    }
    expiry.setDate(expiry.getDate() + 1);
  }
  return Date.now() >= expiry.getTime() ? getTranslations().rewardsExpiredError : null;
}

const redemptionKey = (userId: string, rewardId: string) => JSON.stringify([userId, rewardId]);

export default function RewardsScreen() {
  const { user, token, isAuthenticated } = useAuth();
  const { language, t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [catalogueVersion, setCatalogueVersion] = useState(0);
  const [balanceVersion, setBalanceVersion] = useState(0);
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [catalogue] = useFocusedData(rewardsService.getCoupons, catalogueVersion, user?.id, token);
  const [balance, setBalance] = useFocusedData(rewardsService.getBalance, balanceVersion, user?.id, token);
  const [ledger] = useFocusedData(rewardsService.getRedemptions, ledgerVersion, user?.id, token);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Map<string, ConfirmedRedemption>>(new Map());
  const completed = useRef(new Map<string, ConfirmedRedemption>());
  const locked = useRef(false);
  const mounted = useRef(false);
  const sessionVersion = useRef(0);
  const coupons = catalogue.status === 'success' ? catalogue.data : [];
  const records = ledger.status === 'success' ? ledger.data : [];
  const ready = balance.status === 'success' && ledger.status === 'success';
  const refreshing = catalogue.status === 'loading' || balance.status === 'loading' || ledger.status === 'loading';

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useUserStore.subscribe((next, previous) => {
      if (next.user?.id !== previous.user?.id || next.token !== previous.token ||
          next.isAuthenticated !== previous.isAuthenticated) {
        sessionVersion.current += 1;
        completed.current.clear();
        setRedemptions(new Map());
        setError(null);
      }
    });
    return () => {
      mounted.current = false;
      sessionVersion.current += 1;
      unsubscribe();
    };
  }, []);

  const refresh = () => {
    if (refreshing || locked.current) return;
    setCatalogueVersion((version) => version + 1);
    setBalanceVersion((version) => version + 1);
    setLedgerVersion((version) => version + 1);
  };

  const handleRedeem = async (coupon: RewardCoupon) => {
    if (!mounted.current || locked.current) return;
    locked.current = true;
    const version = sessionVersion.current;
    const initial = useUserStore.getState();
    const initialUserId = initial.user?.id;
    const initialToken = initial.token;
    const initialPoints = initial.user?.totalEcoPoints;
    const isCurrent = () => {
      const latest = useUserStore.getState();
      return mounted.current && sessionVersion.current === version && latest.isAuthenticated &&
        latest.user?.id === initialUserId && latest.token === initialToken;
    };
    setError(null);

    try {
      if (!initial.isAuthenticated || !initial.user || !initial.token) throw new Error(t.rewardsSignInRequired);
      if (!ready || balance.status !== 'success') throw new Error(t.rewardsLoadPrerequisites);
      const key = redemptionKey(initial.user.id, coupon.id);
      if (completed.current.has(key) || records.some((record) => record.rewardId === coupon.id) || coupon.isRedeemed) {
        throw new Error(t.rewardsAlreadyRedeemed);
      }
      if (!Number.isSafeInteger(coupon.pointsCost) || coupon.pointsCost < 0) throw new Error(t.rewardsInvalidCost);
      const expiry = expiryError(coupon.expiryDate);
      if (expiry) throw new Error(expiry);
      if (balance.data < coupon.pointsCost) throw new Error(t.rewardsMissingPoints(coupon.pointsCost - balance.data));
      setPendingId(coupon.id);
      const response = await rewardsService.redeemCoupon(coupon.id);
      if (!isCurrent()) return;
      if (response?.success !== true || !response.promoCode?.trim() || !Number.isSafeInteger(response.newBalance) || response.newBalance < 0) {
        throw new Error(t.rewardsRedeemUnconfirmed);
      }
      const latest = useUserStore.getState();
      if (!latest.user) return;
      const confirmed = { ...response, title: coupon.title };
      completed.current.set(key, confirmed);
      // Do not subtract locally or overwrite points earned while the POST was pending.
      if (latest.user.totalEcoPoints === initialPoints) {
        latest.setUser({ ...latest.user, totalEcoPoints: response.newBalance });
      }
      setRedemptions(new Map(completed.current));
      setBalance({ status: 'success', data: response.newBalance });
      setBalanceVersion((current) => current + 1);
      setLedgerVersion((current) => current + 1);
    } catch (failure) {
      if (isCurrent()) {
        setError(fe2ErrorMessage(failure, t.rewardsRedeemConfirmFailed));
        // Reconcile server state even after an uncertain timeout; never replay a POST.
        setBalanceVersion((current) => current + 1);
        setLedgerVersion((current) => current + 1);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setPendingId(null);
    }
  };

  const confirmed = Array.from(redemptions.values());
  const receipts = new Map(confirmed.map((receipt) => [receipt.transactionId, receipt]));
  const rows = [
    ...records.map((record) => ({
      ...record,
      title: coupons.find((coupon) => coupon.id === record.rewardId)?.title ??
        record.description ?? (t.rewardsRedemptionPrefix + record.transactionId),
      promoCode: receipts.get(record.transactionId)?.promoCode,
    })),
    ...confirmed.filter((receipt) => !records.some((record) => record.transactionId === receipt.transactionId)).map((receipt) => ({
      transactionId: receipt.transactionId, rewardId: receipt.rewardId, title: receipt.title,
      pointsSpent: receipt.pointsSpent, createdAt: null, promoCode: receipt.promoCode,
    })),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{t.rewardsEyebrow}</Text>
            <Text style={styles.title} accessibilityRole="header">{t.rewardsTitle}</Text>
            <Text style={styles.description}>{t.rewardsSubtitle}</Text>
            <AppButton title={t.rewardsReloadDataBtn} variant="outline" onPress={refresh} disabled={refreshing || pendingId !== null} />
          </View>

          {balance.status === 'loading' && (
            <View style={styles.statusCard} accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={t.rewardsLoadingBalanceA11y}>
              <ActivityIndicator color={colors.primary} accessible={false} />
              <Text style={styles.description}>{t.rewardsLoadingBalance}</Text>
            </View>
          )}
          {balance.status === 'error' && (
            <AppCard style={styles.statusCard}>
              <Text style={styles.error} accessibilityRole="alert">{balance.message}</Text>
              <AppButton title={t.rewardsReloadBalanceBtn} onPress={() => setBalanceVersion((version) => version + 1)} />
            </AppCard>
          )}
          {balance.status === 'success' && <PointsSummaryCard balance={balance.data} />}

          <AppCard style={styles.noticeCard}>
            <Text style={styles.description}>
              {t.rewardsMemoryWarning}
            </Text>
          </AppCard>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t.rewardsAvailableTitle}</Text>
            <Text style={styles.description}>{t.rewardsAvailableDesc}</Text>
            {catalogue.status === 'loading' && (
              <View style={styles.statusCard} accessible accessibilityRole="progressbar" accessibilityLabel={t.rewardsLoadingRewardsA11y} accessibilityState={{ busy: true }}>
                <ActivityIndicator size="large" color={colors.primary} accessible={false} />
                <Text style={styles.description}>{t.rewardsLoadingRewards}</Text>
              </View>
            )}
            {catalogue.status === 'error' && (
              <AppCard style={styles.statusCard}>
                <Text style={styles.sectionTitle}>{t.rewardsCatalogUnavailable}</Text>
                <Text style={styles.error} accessibilityRole="alert">{catalogue.message}</Text>
                <AppButton title={t.rewardsReloadRewardsBtn} onPress={() => setCatalogueVersion((version) => version + 1)} />
              </AppCard>
            )}
            {error && <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{error}</Text>}
            {catalogue.status === 'success' && coupons.length === 0 && (
              <AppCard style={styles.statusCard}>
                <Text style={styles.sectionTitle}>{t.rewardsEmptyTitle}</Text>
                <Text style={styles.description}>{t.rewardsEmptyDesc}</Text>
              </AppCard>
            )}
            <View style={styles.grid}>
              {coupons.map((coupon) => {
                const receipt = user ? redemptions.get(redemptionKey(user.id, coupon.id)) : undefined;
                const redeemed = !!receipt || records.some((record) => record.rewardId === coupon.id) || coupon.isRedeemed === true;
                const expiry = expiryError(coupon.expiryDate);
                const missing = balance.status === 'success' ? Math.max(0, coupon.pointsCost - balance.data) : undefined;
                return (
                  <View key={coupon.id} style={[styles.rewardColumn, width >= 900 && fontScale <= 1.3 && styles.desktopColumn]}>
                    <AppCard style={styles.couponCard}>
                      <View style={styles.couponHeader}>
                        <Text style={styles.couponLabel}>{t.rewardsBadgeLabel}</Text>
                        <Badge label={coupon.pointsCost + ' ' + t.points} variant="reward" style={styles.badge} />
                      </View>
                      <Text style={styles.couponTitle}>{coupon.title}</Text>
                      {!!coupon.description && <Text style={styles.description}>{coupon.description}</Text>}
                      <View style={styles.activation}>
                        <AppButton title={redeemed ? t.rewardsRedeemedBtn : t.rewardsRedeemBtn}
                          loading={pendingId === coupon.id}
                          disabled={!isAuthenticated || !user || !ready || pendingId !== null || redeemed || !!expiry || (missing !== undefined && missing > 0)}
                          onPress={() => handleRedeem(coupon)} style={styles.redeemButton} textStyle={styles.buttonText} />
                      </View>
                      {pendingId === coupon.id && <Text style={styles.feedback} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>{t.rewardsRedeeming}</Text>}
                      {redeemed && (
                        <View style={styles.redemptionFeedback} accessibilityLiveRegion="polite">
                          <Badge label={t.rewardsRecordedBadge} variant="success" style={styles.badge} />
                          {receipt && <Text selectable style={styles.promoCode}>{t.rewardsCodePrefix} {receipt.promoCode}</Text>}
                        </View>
                      )}
                      {!redeemed && expiry && <Text style={styles.error}>{expiry}</Text>}
                      {!redeemed && missing !== undefined && missing > 0 && <Text style={styles.feedback}>{t.rewardsMissingPoints(missing)}</Text>}
                    </AppCard>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t.rewardsLedgerTitle}</Text>
            <Text style={styles.description}>
              {t.rewardsLedgerDesc}
            </Text>
            {ledger.status === 'loading' && (
              <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={t.rewardsLoadingLedgerA11y} style={styles.statusCard}>
                <ActivityIndicator color={colors.primary} accessible={false} />
                <Text style={styles.description}>{t.rewardsLoadingLedger}</Text>
              </View>
            )}
            {ledger.status === 'error' && (
              <AppCard style={styles.statusCard}>
                <Text style={styles.error} accessibilityRole="alert">{ledger.message}</Text>
                <AppButton title={t.rewardsReloadLedgerBtn} onPress={() => setLedgerVersion((version) => version + 1)} />
              </AppCard>
            )}
            {ledger.status === 'success' && rows.length === 0 && (
              <AppCard style={styles.statusCard}>
                <Text style={styles.couponTitle}>{t.rewardsNoRedemptionsTitle}</Text>
                <Text style={styles.description}>{t.rewardsNoRedemptionsDesc}</Text>
              </AppCard>
            )}
            {rows.map((row) => (
              <AppCard key={row.transactionId} style={styles.statusCard}>
                <Badge label={row.pointsSpent + ' ' + t.points + t.rewardsSpentSuffix} variant="reward" style={styles.badge} />
                <Text style={styles.couponTitle}>{row.title}</Text>
                {row.createdAt && <Text style={styles.feedback}>{new Date(row.createdAt).toLocaleString(language === 'en' ? 'en-GB' : 'ro-RO')}</Text>}
                {row.promoCode ? <Text selectable style={styles.promoCode}>{row.promoCode}</Text> :
                  <Text style={styles.description}>{t.rewardsCodeUnavailable}</Text>}
              </AppCard>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing['3xl'], alignItems: 'center' },
  content: { width: '100%', maxWidth: 960, gap: spacing['2xl'] },
  heading: { gap: spacing.sm },
  eyebrow: { ...typography.captionMedium, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.h1, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  section: { gap: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  noticeCard: { backgroundColor: colors.warningLight, gap: spacing.sm },
  statusCard: { padding: spacing.xl, gap: spacing.lg },
  error: { ...typography.body, color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  rewardColumn: { flexBasis: '100%', flexGrow: 1, minWidth: 0 },
  desktopColumn: { flexBasis: '45%' },
  couponCard: { flex: 1, gap: spacing.md },
  couponHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  couponLabel: { ...typography.captionMedium, color: colors.textSecondary },
  badge: { maxWidth: '100%', flexShrink: 1 },
  couponTitle: { ...typography.h3, color: colors.textPrimary },
  activation: { marginTop: 'auto', paddingTop: spacing.sm },
  redeemButton: { minHeight: 48 },
  buttonText: { flexShrink: 1, textAlign: 'center' },
  feedback: { ...typography.caption, color: colors.textPrimary },
  redemptionFeedback: { gap: spacing.sm },
  promoCode: { ...typography.bodyMedium, color: colors.textPrimary, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surfaceMuted },
});
