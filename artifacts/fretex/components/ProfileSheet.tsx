import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Avatar } from './Avatar';
import { router } from 'expo-router';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, role, switchRole, logout } = useAuth();
  
  const translateY = useSharedValue(-SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(action, 300);
  };

  const menuItems = [
    {
      icon: 'credit-card' as const,
      label: 'Formas de pagamento',
      onPress: () => handleAction(() => router.push('/payment')),
    },
    {
      icon: 'map-pin' as const,
      label: 'Endereços',
      onPress: () => handleAction(() => {}),
    },
    {
      icon: 'clock' as const,
      label: 'Histórico de pedidos',
      onPress: () => handleAction(() => {}),
    },
    {
      icon: 'star' as const,
      label: 'Avaliações',
      onPress: () => handleAction(() => {}),
    },
    {
      icon: 'shield' as const,
      label: 'Segurança',
      onPress: () => handleAction(() => {}),
    },
    {
      icon: 'repeat' as const,
      label: `Trocar para ${role === 'cliente' ? 'Prestador' : 'Cliente'}`,
      onPress: () => handleAction(() => switchRole(role === 'cliente' ? 'prestador' : 'cliente')),
    },
    {
      icon: 'log-out' as const,
      label: 'Sair',
      destructive: true,
      onPress: () => handleAction(logout),
    },
  ];

  if (!user) return null;

  return (
    <>
      <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.header}>
          <Avatar name={user.name} size={64} showRing />
          <View style={styles.userInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>{user.name}</Text>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                  {role === 'cliente' ? 'Cliente' : 'Prestador'}
                </Text>
              </View>
              {role === 'prestador' && (
                <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.success }]}>Ativo</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                { borderBottomColor: colors.border, borderBottomWidth: index === menuItems.length - 1 ? 0 : 1 },
                pressed && { backgroundColor: colors.muted },
              ]}
              onPress={item.onPress}
            >
              <Feather
                name={item.icon}
                size={20}
                color={item.destructive ? colors.destructive : colors.foreground}
              />
              <Text
                style={[
                  styles.menuLabel,
                  { color: item.destructive ? colors.destructive : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 101,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  menu: {
    paddingHorizontal: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});
