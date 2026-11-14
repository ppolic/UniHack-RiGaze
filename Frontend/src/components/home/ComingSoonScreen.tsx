import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppCard } from '../common/AppCard';
import { AppButton } from '../common/AppButton';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function ComingSoonScreen({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <AppCard>
            <View style={styles.message}>
              <Text style={styles.status}>{t.comingSoonLabel}</Text>
              <Text style={styles.title} accessibilityRole="header">{title}</Text>
              <Text style={styles.description}>{description}</Text>
              <Text style={styles.description}>{t.comingSoonBody}</Text>
              <AppButton title={t.backHomeBtn} onPress={() => router.navigate('/(tabs)/home')} />
            </View>
          </AppCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, alignItems: 'center' },
  content: { width: '100%', maxWidth: 600 },
  message: { gap: spacing.lg },
  status: { ...typography.captionMedium, color: colors.primary },
  title: { ...typography.h2, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
});
