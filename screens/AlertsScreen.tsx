import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCard } from "../components/AlertCard";
import { BOTTOM_NAV_CLEARANCE } from "../components/BottomNavigation";
import { AppHeader, GlassCard, PrimaryButton, Screen } from "../components/ui";
import { useFarm } from "../context/FarmContext";
import { usePlan } from "../context/PlanContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Alerts">;

export function AlertsScreen({ navigation }: Props) {
  const { profile } = useFarm();
  const { plan, status } = usePlan();
  useRequireSession();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Alerts"
          subtitle={profile ? profile.place.name : "No field yet"}
        />
        {!profile ? (
          <GlassCard>
            <Text style={styles.body}>Choose a field to see weather and soil alerts.</Text>
            <View style={styles.button}>
              <PrimaryButton
                label="Set up your farm"
                onPress={() => navigation.navigate("FarmSetup")}
              />
            </View>
          </GlassCard>
        ) : null}
        {profile && !plan ? (
          <GlassCard>
            <Text style={styles.body}>
              {status === "error"
                ? "Alerts need a weather forecast. Pull them in from Home."
                : "Loading alerts for your field..."}
            </Text>
          </GlassCard>
        ) : null}
        {plan ? <AlertCard alerts={plan.alerts} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: BOTTOM_NAV_CLEARANCE,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  button: {
    marginTop: 14,
  },
});
