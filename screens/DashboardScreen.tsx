import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCard } from "../components/AlertCard";
import { CropCheckCard } from "../components/CropCheckCard";
import { DataAvailabilityCard } from "../components/DataAvailabilityCard";
import { BOTTOM_NAV_CLEARANCE } from "../components/BottomNavigation";
import { MotorActivityCard } from "../components/MotorActivityCard";
import { MotorStatsCard } from "../components/MotorStatsCard";
import { MotorStatusCard } from "../components/MotorStatusCard";
import { SevenDayPlanner } from "../components/SevenDayPlanner";
import { SoilMoistureCard } from "../components/SoilMoistureCard";
import { AppHeader, GlassCard, PrimaryButton, Screen } from "../components/ui";
import { WeatherCard } from "../components/WeatherCard";
import { useFarm } from "../context/FarmContext";
import { usePlan } from "../context/PlanContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { colors } from "../theme/colors";
import { cropById, stageLabel } from "../types/farm";
import { formatCoords } from "../utils/format";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const { session, profile, scan, demoMode, setDemoMode, setDemoMoisture, signOut } = useFarm();
  const {
    status,
    error,
    weather,
    soil,
    moisture,
    motor,
    plan,
    advisor,
    refresh,
    weatherFreshness,
    soilFreshness,
    weatherSource,
    soilSource,
  } = usePlan();
  useRequireSession();

  const today = plan?.days[0];
  const crop = profile ? cropById(profile.crop) : null;
  const blocking = Boolean(profile) && !plan && status !== "error";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Farm assistant"
          subtitle={profile ? profile.place.label : "Choose your field"}
          onRefresh={profile ? () => refresh() : undefined}
          refreshing={status === "loading" && Boolean(plan)}
        />
        {session ? (
          <Text style={styles.signedIn}>Signed in as {session.contact}</Text>
        ) : null}
        {profile ? (
          <Text style={styles.coords}>{formatCoords(profile.place.latitude, profile.place.longitude)}</Text>
        ) : null}

        {!profile ? (
          <GlassCard>
            <Text style={styles.setupTitle}>Set up your farm</Text>
            <Text style={styles.setupBody}>
              Choose a location, a crop, and the crop stage. The plan follows that place.
            </Text>
            <View style={styles.setupButton}>
              <PrimaryButton
                label="Choose location and crop"
                onPress={() => navigation.navigate("FarmSetup")}
              />
            </View>
          </GlassCard>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Weather problem</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => refresh()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {blocking ? (
          <GlassCard style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading weather for your field...</Text>
          </GlassCard>
        ) : null}

        {profile && crop && weather && soil && today && plan ? (
          <View style={styles.stack}>
            <WeatherCard weather={weather} today={today} />
            <DataAvailabilityCard
              weatherFreshness={weatherFreshness}
              soilFreshness={soilFreshness}
              weatherSource={weatherSource}
              soilSource={soilSource}
              moistureSource={moisture.source}
              moistureStatus={moisture.status}
            />
            <GlassCard>
              <Text style={styles.kicker}>Crop</Text>
              <Text style={styles.cropName}>{crop.name}</Text>
              <Text style={styles.stage}>Stage: {stageLabel(profile.stage)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit farm"
                onPress={() => navigation.navigate("FarmSetup")}
                style={styles.edit}
              >
                <Text style={styles.editText}>Edit farm</Text>
              </Pressable>
            </GlassCard>
            <SoilMoistureCard
              soil={soil}
              moisture={moisture}
              demoMode={demoMode}
              onDemoMode={setDemoMode}
              onDemoMoisture={setDemoMoisture}
            />
            <CropCheckCard
              scan={scan}
              onScan={() => navigation.navigate("ScanCrop")}
              onMap={() => navigation.navigate("FieldMap")}
            />
            <MotorStatusCard report={motor} />
            <MotorActivityCard history={motor?.history ?? []} />
            <MotorStatsCard report={motor} />
            <SevenDayPlanner
              days={plan.days}
              compact
              onOpen={() => navigation.navigate("Planner")}
            />
            <AdvisorNote advisor={advisor} />
            <Text style={styles.rules}>
              Irrigation and spraying use fixed farm rules. They do not come from an AI guess.
            </Text>
          </View>
        ) : session ? (
          <View style={styles.stack}>
            <CropCheckCard
              scan={scan}
              onScan={() => navigation.navigate("ScanCrop")}
              onMap={() => navigation.navigate("FieldMap")}
            />
            <MotorStatusCard report={motor} />
            <MotorActivityCard history={motor?.history ?? []} />
            <MotorStatsCard report={motor} />
          </View>
        ) : null}

        <Pressable accessibilityRole="button" onPress={signOut} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function AdvisorNote({
  advisor,
}: {
  advisor: ReturnType<typeof usePlan>["advisor"];
}) {
  if (advisor.status === "off") {
    return null;
  }
  if (advisor.status === "loading") {
    return <Text style={styles.advisorMuted}>Writing this week's field note...</Text>;
  }
  if (advisor.status === "error") {
    return (
      <Text style={styles.advisorMuted}>
        The week note could not be written. Motor and spray still follow the farm rules.
      </Text>
    );
  }
  return (
    <GlassCard>
      <Text style={styles.kicker}>Week note</Text>
      <Text style={styles.advisorBody}>{advisor.summary}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: BOTTOM_NAV_CLEARANCE,
  },
  signedIn: {
    marginTop: -6,
    marginBottom: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  coords: {
    marginBottom: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  setupBody: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  setupButton: {
    marginTop: 14,
  },
  errorBox: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    padding: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.danger,
  },
  errorBody: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  retry: {
    marginTop: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.danger,
  },
  loading: {
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  stack: {
    gap: 12,
  },
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  cropName: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  stage: {
    marginTop: 2,
    fontSize: 17,
    color: colors.textPrimary,
  },
  edit: {
    marginTop: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  editText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  advisorMuted: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  advisorBody: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  rules: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  logout: {
    marginTop: 18,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
