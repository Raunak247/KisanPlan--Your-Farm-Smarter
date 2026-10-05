import { StyleSheet, Text, View } from "react-native";
import type { FarmAlert } from "../logic/plannerLogic";
import { colors } from "../theme/colors";
import { GlassCard } from "./ui";

const TONE = {
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: "rgba(142, 42, 42, 0.25)" },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: "rgba(138, 90, 0, 0.25)" },
  info: { bg: colors.accentSoft, fg: colors.primary, border: "rgba(72, 161, 77, 0.25)" },
  ok: { bg: colors.okSoft, fg: colors.accent, border: "rgba(72, 161, 77, 0.25)" },
} as const;

export function AlertCard({ alerts }: { alerts: FarmAlert[] }) {
  const [first, ...rest] = alerts;

  return (
    <GlassCard>
      <Text style={styles.kicker}>Today's Alerts</Text>

      {first ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: TONE[first.tone].bg, borderColor: TONE[first.tone].border },
          ]}
        >
          <Text style={[styles.title, { color: TONE[first.tone].fg }]}>{first.title}</Text>
          <Text style={styles.message}>{first.message}</Text>
        </View>
      ) : (
        <Text style={styles.message}>No alert yet.</Text>
      )}

      {rest.map((alert) => (
        <View
          key={alert.id}
          style={[
            styles.extraCard,
            { backgroundColor: TONE[alert.tone].bg, borderColor: TONE[alert.tone].border },
          ]}
        >
          <Text style={[styles.extraTitle, { color: TONE[alert.tone].fg }]}>{alert.title}</Text>
          <Text style={styles.extraMessage}>{alert.message}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 2,
  },
  banner: {
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
  message: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  extraCard: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  extraTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  extraMessage: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
