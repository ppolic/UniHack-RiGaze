import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PointsSummaryCard } from '../../components/rewards/PointsSummaryCard';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { Badge } from '../../components/common/Badge';
import { rewardsService } from '../../services/rewardsService';
import { RewardCoupon } from '../../types/rewards';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../store/userStore';
import { API_CONFIG } from '../../services/api';

// Date-only rewards remain valid through the end of the device's local day.
function expiryError(expiryDate: string): string | null {
  if (!expiryDate) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(expiryDate);
  const expiry = new Date(dateOnly ? `${expiryDate}T00:00:00` : expiryDate);
  if (!Number.isFinite(expiry.getTime())) return 'Rok valjanosti nije moguće provjeriti.';
  if (dateOnly) {
    const [year, month, day] = expiryDate.split('-').map(Number);
    if (expiry.getFullYear() !== year || expiry.getMonth() + 1 !== month || expiry.getDate() !== day) {
      return 'Rok valjanosti nije moguće provjeriti.';
    }
    expiry.setDate(expiry.getDate() + 1);
  }
  return Date.now() >= expiry.getTime() ? 'Ova demo nagrada je istekla.' : null;
}

const redemptionKey = (userId: string, rewardId: string) => JSON.stringify([userId, rewardId]);

export default function RewardsScreen() {
  const { user, isAuthenticated } = useAuth();
  const [coupons, setCoupons] = useState<RewardCoupon[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Map<string, string>>(new Map());
  const completed = useRef(new Map<string, string>());
  const locked = useRef(false);
  const mounted = useRef(false);
  const sessionVersion = useRef(0);
  const mockMode = API_CONFIG.USE_MOCK_FALLBACK === true;

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const unsubscribe = useUserStore.subscribe((next, previous) => {
      if (next.user?.id !== previous.user?.id || next.token !== previous.token ||
          next.isAuthenticated !== previous.isAuthenticated) {
        sessionVersion.current += 1;
        setError(null);
      }
    });
    rewardsService.getCoupons().then((result) => {
      if (active) setCoupons(result);
    }).catch(() => {
      if (active) setCatalogueError('Nije moguće učitati demo nagrade. Pokušajte ponovno kasnije.');
    });
    return () => {
      active = false;
      mounted.current = false;
      sessionVersion.current += 1;
      unsubscribe();
    };
  }, []);

  const handleRedeem = async (coupon: RewardCoupon) => {
    // State alone cannot block two taps before React renders the disabled buttons.
    if (!mounted.current || locked.current) return;
    locked.current = true;
    const version = sessionVersion.current;
    const initial = useUserStore.getState();
    const userId = initial.user?.id;
    const token = initial.token;
    const isCurrent = () => {
      const latest = useUserStore.getState();
      return mounted.current && sessionVersion.current === version &&
        latest.isAuthenticated && latest.user?.id === userId && latest.token === token;
    };
    setError(null);

    try {
      if (API_CONFIG.USE_MOCK_FALLBACK !== true) {
        throw new Error('Iskorištavanje putem backend sustava još nije dostupno.');
      }
      if (!initial.isAuthenticated || !initial.user || !token) {
        throw new Error('Prijavite se za iskorištavanje demo nagrada.');
      }
      const key = redemptionKey(initial.user.id, coupon.id);
      const cost = coupon.pointsCost;
      const validate = (balance: number) => {
        if (completed.current.has(key) || coupon.isRedeemed) {
          throw new Error('Ova demo nagrada već je iskorištena.');
        }
        if (!Number.isSafeInteger(cost) || cost < 0 || !Number.isFinite(balance)) {
          throw new Error('Bodove za ovu demo nagradu nije moguće provjeriti.');
        }
        const expiry = expiryError(coupon.expiryDate);
        if (expiry) throw new Error(expiry);
        if (balance < cost) throw new Error(`Nedostaje vam ${cost - balance} eko-bodova.`);
      };
      validate(initial.user.totalEcoPoints);
      setPendingId(coupon.id);
      const response = await rewardsService.redeemCoupon(coupon.id);
      if (!isCurrent()) return;
      if (response?.success !== true || typeof response.promoCode !== 'string' || !response.promoCode.trim()) {
        throw new Error('Demo nagrada nije aktivirana. Pokušajte ponovno.');
      }
      if (API_CONFIG.USE_MOCK_FALLBACK !== true) {
        throw new Error('Demo način više nije aktivan. Bodovi nisu potrošeni.');
      }
      // Re-read after the await: FE1 may have awarded points or updated the user.
      const latest = useUserStore.getState();
      if (!latest.user) return;
      validate(latest.user.totalEcoPoints);
      // Commit locally with no await between recording and the balance update.
      completed.current.set(key, response.promoCode.trim());
      latest.setUser({ ...latest.user, totalEcoPoints: latest.user.totalEcoPoints - cost });
      setRedemptions(new Map(completed.current));
    } catch (failure) {
      if (mounted.current && sessionVersion.current === version) {
        setError(failure instanceof Error ? failure.message : 'Iskorištavanje nije uspjelo. Pokušajte ponovno.');
      }
    } finally {
      locked.current = false;
      if (mounted.current) setPendingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <PointsSummaryCard />

        <Text style={styles.sectionTitle}>DEMO katalog nagrada</Text>
        <Text style={styles.notice}>
          Ovo su primjeri nagrada za demonstraciju. Nazivi i popusti nisu stvarne partnerske
          ponude. Generirani promo kodovi nemaju stvarnu vrijednost i ne mogu se iskoristiti.
          Evidencija iskorištavanja privremena je i može nestati pri zatvaranju ovog zaslona.
        </Text>
        {!mockMode && (
          <Text style={styles.notice}>Backend iskorištavanje još nije dostupno. Demo iskorištavanje je isključeno.</Text>
        )}
        {(!isAuthenticated || !user) && (
          <Text style={styles.notice}>Prijavite se za iskorištavanje demo nagrada.</Text>
        )}
        {(catalogueError || error) && (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {catalogueError || error}
          </Text>
        )}

        {coupons.map((coupon) => {
          const code = user ? redemptions.get(redemptionKey(user.id, coupon.id)) : undefined;
          const redeemed = !!code || coupon.isRedeemed === true;
          const expiry = expiryError(coupon.expiryDate);
          const validCost = Number.isSafeInteger(coupon.pointsCost) && coupon.pointsCost >= 0;
          const missing = Math.max(0, coupon.pointsCost - (user?.totalEcoPoints ?? 0));
          return (
            <AppCard key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponHeader}>
                <View>
                  <Text style={styles.partnerName}>Demo primjer: {coupon.partnerName}</Text>
                  <Text style={styles.couponTitle}>{coupon.title}</Text>
                </View>
                <Badge
                  label={`${coupon.pointsCost} bodova`}
                  variant="reward"
                />
              </View>

              <Text style={styles.couponDesc}>{coupon.description}</Text>

              <View style={styles.couponFooter}>
                <Badge label={coupon.discountValue} variant="success" />
                <AppButton
                  title={redeemed ? 'Redeemed — demo' : 'Iskoristi — demo'}
                  loading={pendingId === coupon.id}
                  disabled={!mockMode || !isAuthenticated || !user || pendingId !== null || redeemed || !!expiry || !validCost || missing > 0}
                  size="sm"
                  onPress={() => handleRedeem(coupon)}
                />
              </View>
              {pendingId === coupon.id && (
                <Text style={styles.feedback} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
                  Aktiviranje demo nagrade…
                </Text>
              )}
              {redeemed ? (
                <View style={styles.redemptionFeedback} accessibilityLiveRegion="polite">
                  <Badge label="Redeemed — demo" variant="success" />
                  {code && <Text selectable style={styles.promoCode}>Demo promo kod: {code}</Text>}
                </View>
              ) : expiry || !validCost ? (
                <Text style={styles.error}>{expiry || 'Neispravan trošak nagrade.'}</Text>
              ) : missing > 0 && (
                <Text style={styles.feedback}>Nedostaje vam {missing} eko-bodova.</Text>
              )}
            </AppCard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  notice: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginVertical: spacing.sm,
  },
  feedback: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  redemptionFeedback: {
    marginTop: spacing.sm,
  },
  promoCode: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  couponCard: {
    marginBottom: spacing.md,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  partnerName: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  couponTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  couponDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginVertical: spacing.sm,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
