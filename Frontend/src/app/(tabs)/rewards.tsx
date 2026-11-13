import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
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

export default function RewardsScreen() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<RewardCoupon[]>([]);

  useEffect(() => {
    rewardsService.getCoupons().then(setCoupons);
  }, []);

  const handleRedeem = async (coupon: RewardCoupon) => {
    if ((user?.totalEcoPoints ?? 0) < coupon.pointsCost) {
      Alert.alert(
        'Nedovoljno bodova',
        `Potrebno vam je ${coupon.pointsCost} bodova. Nastavite birati zelene rute!`
      );
      return;
    }

    const res = await rewardsService.redeemCoupon(coupon.id);
    Alert.alert(
      'Kupon uspješno aktiviran! 🎟️',
      `Vaš kod za ${coupon.partnerName}:\n\n${res.promoCode}\n\nPokažite ovaj kod na blagajni.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <PointsSummaryCard />

        <Text style={styles.sectionTitle}>Dostupne Nagrade i Partneri</Text>

        {coupons.map((coupon) => (
          <AppCard key={coupon.id} style={styles.couponCard}>
            <View style={styles.couponHeader}>
              <View>
                <Text style={styles.partnerName}>{coupon.partnerName}</Text>
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
                title="Iskoristi"
                size="sm"
                onPress={() => handleRedeem(coupon)}
              />
            </View>
          </AppCard>
        ))}
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
