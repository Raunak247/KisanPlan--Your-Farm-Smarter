import { StyleSheet, Text, View } from "react-native";
import type { MotorSample } from "../services/sensorService";
import { colors } from "../theme/colors";
import { GlassCard } from "./ui";

function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MotorActivityCard({ history }: { history: MotorSample[] }) {
  const first = history[0];
  const last = history[history.length - 1];
  const summary = last
    ? `Latest soil moisture ${last.moisture} percent. Pump ${last.motor === "ON" ? "on" : "off"}.`
    : "No ESP32 readings yet.";

  return (
    <GlassCard>
      <Text style={styles.kicker}>Motor activity</Text>
      <Text style={styles.note}>Bar height is soil moisture. Green means the pump was on. Gray means it was off.</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>The graph fills as the ESP32 sends readings.</Text>
      ) : (
        <View accessibilityLabel={summary}>
          <View style={styles.plot}>
            {history.map((point) => (
              <View key={point.at} style={styles.slot}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(6, Math.round((point.moisture / 100) * 112)) },
                    point.motor === "ON" ? styles.barOn : styles.barOff,
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.axis}>
            <Text style={styles.axisText}>{first ? clock(first.at) : ""}</Text>
            <Text style={styles.axisText}>{last ? clock(last.at) : ""}</Text>
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  note: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  empty: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  plot: {
    marginTop: 14,
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  slot: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  barOn: {
    backgroundColor: colors.accent,
  },
  barOff: {
    backgroundColor: colors.textSecondary,
  },
  axis: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
