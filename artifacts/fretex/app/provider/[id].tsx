import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Image as RNImage } from 'react-native';
import { useLocalSearchParams, useRouter } from 'react-router-dom'; // Note: using expo-router hooks
import { useLocalSearchParams as useExpoParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_PROVIDERS } from '@/constants/mockData';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { RatingStars } from '@/components/RatingStars';

export default function ProviderProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useExpoParams();
  const { user } = useAuth();
  
  const provider = MOCK_PROVIDERS.find(p => p.id === id) || MOCK_PROVIDERS[0];
  const isOwner = user?.id === id;

  const [tabIndex, setTabIndex] = useState(0); // 0 = Sobre, 1 = Serviços, 2 = Portfólio, 3 = Avaliações

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: provider.truckPhoto }}
            style={styles.coverImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={StyleSheet.absoluteFillObject}
          />
          <IconButton
            icon="arrow-left"
            color="white"
            variant="solid"
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          />
          {isOwner && (
            <IconButton
              icon="edit-2"
              color="white"
              variant="solid"
              style={[styles.editCoverBtn, { top: insets.top + 8 }]}
              onPress={() => {}}
            />
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileHeader}>
          <Avatar src={provider.avatar} name={provider.name} size={96} style={styles.avatar} showRing={provider.isOnline} />
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{provider.name}</Text>
            <Feather name="check-circle" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {provider.category} • {provider.neighborhood}
          </Text>
          
          <View style={styles.ratingContainer}>
            <RatingStars rating={provider.rating} size={18} />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{provider.rating}</Text>
            <Text style={[styles.reviewsText, { color: colors.mutedForeground }]}>({provider.reviews} avaliações)</Text>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <View style={styles.actionItem}>
              <IconButton icon="message-circle" variant="outline" onPress={() => {}} size={20} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Mensagem</Text>
            </View>
            <View style={styles.actionItem}>
              <IconButton icon="phone" variant="outline" onPress={() => {}} size={20} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Ligar</Text>
            </View>
            <View style={styles.actionItem}>
              <IconButton icon="heart" variant="outline" onPress={() => {}} size={20} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Salvar</Text>
            </View>
            <View style={styles.actionItem}>
              <IconButton icon="share" variant="outline" onPress={() => {}} size={20} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Compartilhar</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <SegmentedControl
            tabs={['Sobre', 'Serviços', 'Portfólio', 'Avaliações']}
            selectedIndex={tabIndex}
            onChange={setTabIndex}
          />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {tabIndex === 0 && (
            <View>
              <Text style={[styles.aboutText, { color: colors.foreground }]}>
                Profissional com mais de 5 anos de experiência em mudanças residenciais e comerciais. 
                Possuo caminhão baú próprio (tamanho médio), ajudantes treinados e material completo para embalagem.
              </Text>
              <View style={[styles.infoCard, { backgroundColor: colors.muted }]}>
                <Feather name="truck" size={24} color={colors.foreground} />
                <View style={styles.infoCardText}>
                  <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Veículo Próprio</Text>
                  <Text style={[styles.infoCardDesc, { color: colors.mutedForeground }]}>Caminhão Baú 3/4 - Placa MER-COSUL</Text>
                </View>
              </View>
            </View>
          )}

          {tabIndex === 1 && (
            <View>
              {[
                { n: 'Mudança Completa', p: 'R$ 450/diária' },
                { n: 'Frete Pequeno', p: 'R$ 150/saída' },
                { n: 'Ajudante Extra', p: 'R$ 100/diária' },
              ].map((s, i) => (
                <View key={i} style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.serviceName, { color: colors.foreground }]}>{s.n}</Text>
                  <Text style={[styles.servicePrice, { color: colors.primary }]}>{s.p}</Text>
                </View>
              ))}
            </View>
          )}

          {tabIndex === 2 && (
            <View style={styles.portfolioGrid}>
              <Image source={{ uri: provider.truckPhoto }} style={styles.portfolioImage} />
              <Image source={{ uri: 'https://images.unsplash.com/photo-1581092921461-7d2d0c24096d?q=80&w=200&auto=format&fit=crop' }} style={styles.portfolioImage} />
            </View>
          )}

          {tabIndex === 3 && (
            <View>
              <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewerName, { color: colors.foreground }]}>Mariana Costa</Text>
                  <RatingStars rating={5} size={12} />
                </View>
                <Text style={[styles.reviewText, { color: colors.mutedForeground }]}>
                  Excelente serviço! Muito cuidadoso com os móveis e chegou no horário combinado.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isOwner ? (
          <PrimaryButton title="Editar perfil" variant="secondary" onPress={() => {}} />
        ) : (
          <PrimaryButton title="Solicitar serviço" onPress={() => router.push('/request')} />
        )}
      </View>
    </View>
  );
}

// Need to create LinearGradient manually for the cover fade
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  editCoverBtn: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  profileHeader: {
    paddingHorizontal: 24,
    marginTop: -48,
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 4,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  category: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  reviewsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  tabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tabContent: {
    paddingHorizontal: 24,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  infoCardText: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioImage: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
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
