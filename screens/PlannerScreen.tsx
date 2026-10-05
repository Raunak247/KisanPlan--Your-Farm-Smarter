import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BOTTOM_NAV_CLEARANCE } from "../components/BottomNavigation";
import { SevenDayPlanner } from "../components/SevenDayPlanner";
import { AppHeader, GlassCard, PrimaryButton, Screen } from "../components/ui";
import { useFarm } from "../context/FarmContext";
import { usePlan } from "../context/PlanContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { colors } from "../theme/colors";
import { cropById, stageLabel } from "../types/farm";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Planner">;

export function PlannerScreen({ navigation }: Props) {
  const { profile } = useFarm();
  const { plan, advisor } = usePlan();
  useRequireSession();
  const crop = profile ? cropById(profile.crop) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="7-day plan"
          subtitle={profile ? `${profile.place.name} · ${crop?.name ?? ""}` : "No farm yet"}
          onBack={() => navigation.navigate("Dashboard")}
        />
        {!plan || !profile || !crop ? (
          <GlassCard>
            <Text style={styles.empty}>Set a location and crop to build the week.</Text>
            <View style={styles.button}>
              <PrimaryButton label="Back to dashboard" onPress={() => navigation.navigate("Dashboard")} />
            </View>
          </GlassCard>
        ) : (
          <View style={styles.stack}>
            <Text style={styles.intro}>
              {crop.name}, {stageLabel(profile.stage).toLowerCase()}. Later days estimate how moisture changes after rain or irrigation.
            </Text>
            {advisor.status === "loading" ? (
              <Text style={styles.note}>Writing a field note from this week's weather...</Text>
            ) : null}
            {advisor.status === "ready" ? (
              <GlassCard>
                <Text style={styles.kicker}>Week note</Text>
                <Text style={styles.summary}>{advisor.summary}</Text>
              </GlassCard>
            ) : null}
            {advisor.status === "error" ? (
              <Text style={styles.note}>
                The week note could not be written. Motor and spray still follow the farm rules.
              </Text>
            ) : null}
            <SevenDayPlanner
              days={plan.days}
              advisorDaily={advisor.status === "ready" ? advisor.daily : null}
            />
            <PrimaryButton label="Back to dashboard" onPress={() => navigation.navigate("Dashboard")} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: BOTTOM_NAV_CLEARANCE,
  },
  stack: {
    gap: 12,
  },
  intro: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  summary: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  note: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  empty: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  button: {
    marginTop: 14,
  },
});
