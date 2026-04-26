import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColors';
import { useSupport } from '@/contexts/SupportContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FormField } from '@/components/FormField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatusBadge } from '@/components/StatusBadge';

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tickets, createTicket } = useSupport();

  const [tabIndex, setTabIndex] = useState(0); // 0 = Tickets, 1 = Abrir, 2 = FAQ
  
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleOpenTicket = async () => {
    if (!motivo || !descricao) return;
    await createTicket(motivo, descricao);
    setMotivo('');
    setDescricao('');
    setTabIndex(0);
  };

  const handleContact = (type: 'whatsapp' | 'email' | 'phone') => {
    if (type === 'whatsapp') Linking.openURL('whatsapp://send?phone=5511999999999');
    if (type === 'email') Linking.openURL('mailto:suporte@fretex.com');
    if (type === 'phone') Linking.openURL('tel:+5511999999999');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 100 }}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Suporte</Text>
      
      <View style={styles.tabsContainer}>
        <SegmentedControl
          tabs={['Meus Tickets', 'Novo', 'FAQ']}
          selectedIndex={tabIndex}
          onChange={setTabIndex}
        />
      </View>

      {tabIndex === 0 && (
        <View style={styles.content}>
          {tickets.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>
                Você não tem tickets abertos.
              </Text>
              <PrimaryButton
                title="Abrir chamado"
                variant="outline"
                style={{ marginTop: 16 }}
                onPress={() => setTabIndex(1)}
              />
            </View>
          ) : (
            tickets.map(t => (
              <View key={t.id} style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.ticketHeader}>
                  <Text style={[styles.ticketReason, { color: colors.foreground }]}>{t.reason}</Text>
                  <StatusBadge status={t.status} />
                </View>
                <Text style={[styles.ticketDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {t.description}
                </Text>
                <Text style={[styles.ticketDate, { color: colors.mutedForeground }]}>
                  {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contato direto</Text>
          <View style={styles.contactGrid}>
            <Pressable style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleContact('whatsapp')}>
              <Feather name="message-circle" size={24} color={colors.success} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>WhatsApp</Text>
            </Pressable>
            <Pressable style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleContact('email')}>
              <Feather name="mail" size={24} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>E-mail</Text>
            </Pressable>
          </View>
        </View>
      )}

      {tabIndex === 1 && (
        <View style={styles.content}>
          <FormField label="Motivo">
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
              placeholder="Ex: Problema com pagamento"
              placeholderTextColor={colors.mutedForeground}
              value={motivo}
              onChangeText={setMotivo}
            />
          </FormField>
          <FormField label="Descrição detalhada">
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground }]}
              placeholder="Descreva o que aconteceu..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={descricao}
              onChangeText={setDescricao}
            />
          </FormField>
          <PrimaryButton
            title="Enviar solicitação"
            onPress={handleOpenTicket}
            disabled={!motivo || !descricao}
          />
        </View>
      )}

      {tabIndex === 2 && (
        <View style={styles.content}>
          {[
            'Como cancelar um serviço?',
            'Como receber pagamentos?',
            'O que fazer se o prestador não chegar?',
            'Como alterar meu veículo?',
          ].map((q, i) => (
            <Pressable key={i} style={[styles.faqItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.faqQuestion, { color: colors.foreground }]}>{q}</Text>
              <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  content: {
    paddingHorizontal: 16,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  ticketCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketReason: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    marginRight: 8,
  },
  ticketDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
    lineHeight: 20,
  },
  ticketDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 24,
    marginBottom: 16,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    height: 120,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    marginRight: 16,
  },
});
