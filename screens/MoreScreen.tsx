import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BOTTOM_NAV_CLEARANCE } from "../components/BottomNavigation";
import { AppHeader, GlassCard, Screen } from "../components/ui";
import { useFarm } from "../context/FarmContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { colors } from "../theme/colors";
import { cropById, stageLabel } from "../types/farm";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "More">;

export function MoreScreen({ navigation }: Props) {
  const { session, profile, demoMode, setDemoMode, signOut } = useFarm();
  useRequireSession();
  const crop = profile ? cropById(profile.crop) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="More" subtitle="Account and field" />
        <GlassCard>
          <Text style={styles.kicker}>Signed in</Text>
          <Text style={styles.value}>{session?.contact ?? "Not signed in"}</Text>
        </GlassCard>
        <GlassCard>
          <Text style={styles.kicker}>Your farm</Text>
          {profile && crop ? (
            <Text style={styles.value}>
              {profile.place.label}
              {"\n"}
              {crop.name} · {stageLabel(profile.stage)}
            </Text>
          ) : (
            <Text style={styles.value}>No field selected yet.</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit farm"
            onPress={() => navigation.navigate("FarmSetup")}
            style={styles.rowButton}
          >
            <Text style={styles.rowButtonText}>Edit farm</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan crop"
            onPress={() => navigation.navigate("ScanCrop")}
            style={styles.rowButton}
          >
            <Text style={styles.rowButtonText}>Scan crop</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Field map"
            onPress={() => navigation.navigate("FieldMap")}
            style={styles.rowButton}
          >
            <Text style={styles.rowButtonText}>Field map</Text>
          </Pressable>
        </GlassCard>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Demo sensor"
          accessibilityState={{ checked: demoMode }}
          onPress={() => setDemoMode(!demoMode)}
          style={styles.toggle}
        >
          <View>
            <Text style={styles.toggleTitle}>Demo sensor</Text>
            <Text style={styles.toggleHint}>
              {demoMode
                ? "On. The dashboard still uses the ESP32 reading."
                : "Off. The dashboard uses the ESP32 reading."}
            </Text>
          </View>
          <Text style={styles.toggleValue}>{demoMode ? "On" : "Off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={signOut} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: BOTTOM_NAV_CLEARANCE,
    gap: 12,
  },
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  value: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rowButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  toggle: {
    minHeight: 64,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  toggleHint: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  toggleValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  logout: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
