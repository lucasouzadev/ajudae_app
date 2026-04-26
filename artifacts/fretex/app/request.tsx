import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { PrimaryButton } from '@/components/PrimaryButton';
import { IconButton } from '@/components/IconButton';
import { FormField } from '@/components/FormField';

export default function RequestFlowScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < totalSteps) {
      setStep(s => s + 1);
    } else {
      router.replace('/payment');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="x" onPress={handleBack} />
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i + 1 <= step ? colors.primary : colors.muted },
              ]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>Onde será o serviço?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Confirme os endereços de origem e destino
            </Text>
            
            <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.timeline}>
                <View style={[styles.timelineDot, { backgroundColor: colors.foreground }]} />
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                <View style={[styles.timelineSquare, { backgroundColor: colors.primary }]} />
              </View>
              <View style={styles.addressInputs}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderBottomColor: colors.border }]}
                  placeholder="Endereço de coleta"
                  placeholderTextColor={colors.mutedForeground}
                  defaultValue="Rua Fradique Coutinho, 100"
                />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Endereço de entrega"
                  placeholderTextColor={colors.mutedForeground}
                  defaultValue="Av. Paulista, 1000"
                />
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>Qual o tamanho da carga?</Text>
            <View style={styles.optionsGrid}>
              {[
                { t: 'Pequena', d: 'Caixas, eletrodoméstico único', i: 'box' },
                { t: 'Média', d: 'Quarto completo, sofá e rack', i: 'truck' },
                { t: 'Grande', d: 'Casa completa 2+ quartos', i: 'home' },
              ].map((opt, i) => (
                <Pressable
                  key={i}
                  style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleNext}
                >
                  <Feather name={opt.i as any} size={24} color={colors.primary} />
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{opt.t}</Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{opt.d}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>Detalhes importantes</Text>
            <FormField label="O que será transportado?">
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground }]}
                placeholder="Ex: 1 geladeira, 1 sofá, 4 caixas..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
              />
            </FormField>
            
            <Text style={[styles.label, { color: colors.foreground }]}>Fotos (opcional)</Text>
            <Pressable style={[styles.photoUpload, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Feather name="camera" size={24} color={colors.mutedForeground} />
              <Text style={[styles.photoText, { color: colors.mutedForeground }]}>Adicionar fotos da carga</Text>
            </Pressable>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>Resumo do Pedido</Text>
            
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Distância</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>4.2 km</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tempo estimado</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>30-45 min</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>Valor estimado</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>R$ 150,00</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title={step === totalSteps ? 'Confirmar e Pagar' : 'Continuar'}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 32,
  },
  addressCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeline: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 16,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineSquare: {
    width: 8,
    height: 8,
  },
  addressInputs: {
    flex: 1,
  },
  input: {
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    borderBottomWidth: 1,
  },
  optionsGrid: {
    gap: 16,
  },
  optionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  optionDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    height: 100,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  photoUpload: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
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
