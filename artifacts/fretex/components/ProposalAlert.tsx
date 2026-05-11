import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fonts } from "@/constants/colors";

const COUNTDOWN_SECS = 60;
const ACCENT = "#FFC90E";

export interface ProposalAlertPayload {
  title: string;
  body: string;
  requestId?: string;
}

interface Props {
  payload: ProposalAlertPayload;
  onDismiss: () => void;
}

export function ProposalAlert({ payload, onDismiss }: Props) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECS);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    Animated.timing(progress, {
      toValue: 0,
      duration: COUNTDOWN_SECS * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDismiss();
    router.push("/proposals");
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDismiss();
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="cube" size={32} color={ACCENT} />
          </View>

          <Text style={styles.title}>{payload.title}</Text>
          <Text style={styles.body}>{payload.body}</Text>

          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.45)" />
            <Text style={styles.timerText}>Expira em {secondsLeft}s</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleDecline} style={styles.declineBtn}>
              <Text style={styles.declineTxt}>Recusar</Text>
            </Pressable>
            <Pressable onPress={handleAccept} style={styles.acceptBtn}>
              <Ionicons name="checkmark-circle" size={18} color="#1A1A1A" />
              <Text style={styles.acceptTxt}>Ver proposta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#1F1F1F",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,201,14,0.25)",
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,201,14,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.serif.extra,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    fontFamily: fonts.sans.regular,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 11,
    fontFamily: fonts.sans.medium,
    color: "rgba(255,255,255,0.45)",
  },
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressFill: {
    height: "100%",
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  declineTxt: {
    fontSize: 14,
    fontFamily: fonts.sans.semibold,
    color: "rgba(255,255,255,0.55)",
  },
  acceptBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptTxt: {
    fontSize: 14,
    fontFamily: fonts.sans.bold,
    color: "#1A1A1A",
  },
});
