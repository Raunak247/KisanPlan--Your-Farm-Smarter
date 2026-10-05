import { StyleSheet, Text, View } from "react-native";
import type { MotorReport } from "../services/sensorService";
import { colors } from "../theme/colors";
import { formatPercent } from "../utils/format";
import { GlassCard } from "./ui";

export function MotorStatusCard({ report }: { report: MotorReport | null }) {
  const motor = report?.motor ?? null;
  const on = motor === "ON";

  return (
    <GlassCard>
      <Text style={styles.kicker}>Motor</Text>
      <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
        <Text style={[styles.pillText, on ? styles.pillTextOn : styles.pillTextOff]}>
          {motor ?? "—"}
        </Text>
      </View>
      <Text style={styles.moisture} maxFontSizeMultiplier={1.2}>
        {report?.moisture == null ? "Soil moisture —" : `Soil moisture ${formatPercent(report.moisture)}`}
      </Text>
      <Text style={styles.reason} maxFontSizeMultiplier={1.25}>
        {report?.reason ?? "Waiting for the ESP32."}
      </Text>
      {report ? (
        <Text style={styles.rule}>
          {report.status === "live" ? "Live from the ESP32." : "Offline. Showing the last ESP32 report."}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  pill: {
    alignSelf: "flex-start",
    marginTop: 10,
    minWidth: 96,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  pillOn: {
    backgroundColor: colors.accent,
  },
  pillOff: {
    backgroundColor: colors.primarySoft,
  },
  pillText: {
    fontSize: 28,
    fontWeight: "800",
  },
  pillTextOn: {
    color: colors.white,
  },
  pillTextOff: {
    color: colors.primary,
  },
  moisture: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  reason: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  rule: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
