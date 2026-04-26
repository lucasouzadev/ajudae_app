import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { PrimaryButton } from '@/components/PrimaryButton';
import { IconButton } from '@/components/IconButton';

export default function PaymentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [method, setMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePay = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSuccess(true);
    setTimeout(() => {
      router.dismissAll();
    }, 2000);
  };

  if (isSuccess) {
    return (
      <View style={[styles.container, styles.successCenter, { backgroundColor: colors.background }]}>
        <View style={[styles.successIconBg, { backgroundColor: colors.success + '20' }]}>
          <Feather name="check" size={48} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Pedido Confirmado!</Text>
        <Text style={[styles.successText, { color: colors.mutedForeground }]}>
          O prestador já foi notificado.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="x" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.serviceType, { color: colors.foreground }]}>Frete Pequeno</Text>
          <Text style={[styles.providerName, { color: colors.mutedForeground }]}>Carlos Oliveira</Text>
          <Text style={[styles.amount, { color: colors.primary }]}>R$ 150,00</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Forma de pagamento</Text>
        
        <View style={styles.methodsGrid}>
          <Pressable
            style={[
              styles.methodCard,
              { backgroundColor: colors.card, borderColor: method === 'pix' ? colors.primary : colors.border },
            ]}
            onPress={() => setMethod('pix')}
          >
            <View style={[styles.radio, { borderColor: method === 'pix' ? colors.primary : colors.border }]}>
              {method === 'pix' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
            </View>
            <Feather name="maximize" size={24} color={colors.primary} />
            <Text style={[styles.methodName, { color: colors.foreground }]}>Pix</Text>
          </Pressable>

          <Pressable
            style={[
              styles.methodCard,
              { backgroundColor: colors.card, borderColor: method === 'card' ? colors.primary : colors.border },
            ]}
            onPress={() => setMethod('card')}
          >
            <View style={[styles.radio, { borderColor: method === 'card' ? colors.primary : colors.border }]}>
              {method === 'card' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
            </View>
            <Feather name="credit-card" size={24} color={colors.foreground} />
            <Text style={[styles.methodName, { color: colors.foreground }]}>Cartão final 4242</Text>
          </Pressable>

          <Pressable
            style={[
              styles.methodCard,
              { backgroundColor: colors.card, borderColor: method === 'cash' ? colors.primary : colors.border },
            ]}
            onPress={() => setMethod('cash')}
          >
            <View style={[styles.radio, { borderColor: method === 'cash' ? colors.primary : colors.border }]}>
              {method === 'cash' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
            </View>
            <Feather name="dollar-sign" size={24} color={colors.success} />
            <Text style={[styles.methodName, { color: colors.foreground }]}>Dinheiro na entrega</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title={`Confirmar ${method === 'pix' ? 'com Pix' : 'Pagamento'}`}
          onPress={handlePay}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  successCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 32,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  methodsGrid: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  methodName: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginLeft: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
