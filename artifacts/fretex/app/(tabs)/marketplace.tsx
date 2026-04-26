import React from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_PROVIDERS } from '@/constants/mockData';

import { Chip } from '@/components/Chip';
import { ServiceCard } from '@/components/ServiceCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatBadge } from '@/components/StatBadge';

const CATEGORIES = ['Todos', 'Mudança', 'Frete pequeno', 'Carreto'];

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  
  if (role === 'prestador') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 100 }}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Visão de Mercado</Text>
        
        <View style={styles.statsGrid}>
          <StatBadge title="Demanda (sua região)" value="Alta" icon="activity" trend="+12%" trendUp />
          <StatBadge title="Ticket Médio" value="R$ 145" icon="tag" />
        </View>

        <View style={styles.statsGrid}>
          <StatBadge title="Horários de pico" value="14h - 18h" icon="clock" />
        </View>

        <View style={styles.section}>
          <PrimaryButton
            title="Publicar oferta no mapa"
            onPress={() => {}}
            icon={<Feather name="map-pin" size={20} color="white" />}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suas publicações ativas</Text>
        
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="map-pin" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>
            Nenhuma oferta publicada no momento.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Cliente UI
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={[styles.searchContainer, { backgroundColor: colors.input }]}>
          <Feather name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar serviço ou prestador"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <View style={styles.customRequest}>
          <PrimaryButton
            title="Solicitação personalizada"
            variant="secondary"
            onPress={() => router.push('/request')}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {CATEGORIES.map((cat, i) => (
            <Chip key={cat} label={cat} selected={i === 0} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {MOCK_PROVIDERS.map(p => (
          <ServiceCard
            key={p.id}
            provider={p}
            onPress={() => router.push(`/provider/${p.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  customRequest: {
    marginBottom: 16,
  },
  chipsScroll: {
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  emptyState: {
    marginHorizontal: 16,
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
});
