import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestsContext';
import { MOCK_PROVIDERS } from '@/constants/mockData';

import { MapCanvas } from '@/components/MapCanvas';
import { ProviderPin } from '@/components/ProviderPin';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { BottomSheet } from '@/components/BottomSheet';
import { ProviderCard } from '@/components/ProviderCard';
import { ProfileSheet } from '@/components/ProfileSheet';
import { StatBadge } from '@/components/StatBadge';

const CATEGORIES = ['Mudança', 'Frete pequeno', 'Frete grande', 'Entrega', 'Carreto'];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { requests } = useRequests();

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [isOnline, setIsOnline] = useState(true);

  // Cliente UI
  if (role === 'cliente') {
    return (
      <View style={styles.container}>
        <MapCanvas>
          {/* User Location */}
          <ProviderPin id="user" name="Você" avatar="" x={150} y={400} isOnline={false} isUser />
          
          {/* Provider Pins */}
          {MOCK_PROVIDERS.map(p => (
            <ProviderPin
              key={p.id}
              id={p.id}
              name={p.name}
              avatar={p.avatar}
              x={150 + p.lat * 1000 + 23550} // Mock coordinates spreading
              y={400 + p.lng * 1000 + 46680}
              isOnline={p.isOnline}
              onPress={() => router.push(`/provider/${p.id}`)}
            />
          ))}
        </MapCanvas>

        {/* Top Floating Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Para onde vamos?"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <Avatar
            name={user?.name || 'C'}
            size={48}
            style={styles.avatarBtn}
            showRing
            onPress={() => setProfileSheetOpen(true)}
          />
        </View>

        {/* Floating Category Pills */}
        <View style={[styles.pillsContainer, { bottom: 220 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {CATEGORIES.map(cat => (
              <Chip
                key={cat}
                label={cat}
                selected={selectedCategory === cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory(cat);
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Bottom Sheet */}
        <BottomSheet snapPoints={[200, 600]} initialSnap={0}>
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Prestadores próximos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {MOCK_PROVIDERS.filter(p => p.isOnline).map(p => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  layout="vertical"
                  onPress={() => router.push(`/provider/${p.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        </BottomSheet>

        <ProfileSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
      </View>
    );
  }

  // Prestador UI
  const activeRequest = requests.find(r => r.status === 'in_progress' || r.status === 'accepted' || r.status === 'provider_en_route');

  return (
    <View style={styles.container}>
      <MapCanvas>
        <ProviderPin id="me" name={user?.name || ''} avatar="" x={180} y={350} isOnline={isOnline} />
      </MapCanvas>

      {/* Top Floating Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16, justifyContent: 'flex-end' }]}>
        <Avatar
          name={user?.name || 'P'}
          size={48}
          style={styles.avatarBtn}
          showRing={isOnline}
          onPress={() => setProfileSheetOpen(true)}
        />
      </View>

      <BottomSheet snapPoints={[320, 600]} initialSnap={0}>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.toggleRow}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {isOnline ? 'Você está Online' : 'Você está Offline'}
            </Text>
            <Chip
              label={isOnline ? 'Ficar Offline' : 'Ficar Online'}
              selected={isOnline}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsOnline(!isOnline);
              }}
            />
          </View>

          {activeRequest ? (
            <View style={[styles.activeCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Text style={[styles.activeCardTitle, { color: colors.primary }]}>Serviço em andamento</Text>
              <Text style={[styles.activeCardText, { color: colors.foreground }]}>{activeRequest.serviceType}</Text>
              <Text style={[styles.activeCardSub, { color: colors.mutedForeground }]}>{activeRequest.origin} → {activeRequest.destination}</Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatBadge title="Ganhos hoje" value="R$ 350" icon="dollar-sign" trend="+15%" trendUp />
              <StatBadge title="Concluídos" value="4" icon="check-circle" />
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>Desempenho da semana</Text>
          <View style={styles.statsGrid}>
            <StatBadge title="Ganhos da semana" value="R$ 1.850" icon="calendar" />
            <StatBadge title="Avaliação" value="4.9" icon="star" />
          </View>
        </ScrollView>
      </BottomSheet>

      <ProfileSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  avatarBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pillsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sheetContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginLeft: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  activeCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  activeCardText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  activeCardSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
});
