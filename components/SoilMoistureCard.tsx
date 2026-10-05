import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MoistureReading } from "../services/sensorService";
import type { SoilData } from "../services/soilService";
import { colors } from "../theme/colors";
import { formatPercent, formatTemp } from "../utils/format";
import { GlassCard } from "./ui";

const DRAINAGE_LABEL = {
  poor: "Drains slowly",
  moderate: "Drains moderately",
  free: "Drains quickly",
} as const;

export function SoilMoistureCard({
  soil,
  moisture,
  demoMode,
  onDemoMode,
  onDemoMoisture,
}: {
  soil: SoilData;
  moisture: MoistureReading;
  demoMode: boolean;
  onDemoMode: (enabled: boolean) => void;
  onDemoMoisture: (moisture: number) => void;
}) {
  const showStepper = demoMode && moisture.source !== "iot";
  const reading = moisture.moisture;

  return (
    <GlassCard>
      <View style={styles.titleRow}>
        <Text style={styles.kicker}>Soil moisture</Text>
        {moisture.source === "iot" ? (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>Live</Text>
          </View>
        ) : moisture.source === "demo" ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>DEMO</Text>
          </View>
        ) : (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <Text style={styles.reading} maxFontSizeMultiplier={1.15}>
        {reading == null ? "—" : formatPercent(reading)}
      </Text>
      <Text style={styles.source} maxFontSizeMultiplier={1.2}>
        {moisture.source === "iot"
          ? "Live IoT sensor"
          : moisture.source === "demo"
            ? "Demo sensor. This is not a live IoT device."
            : "Offline. Waiting for the ESP32 reading."}
      </Text>

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Demo sensor"
        accessibilityState={{ checked: demoMode }}
        onPress={() => onDemoMode(!demoMode)}
        style={styles.toggle}
      >
        <Text style={styles.toggleLabel}>Demo sensor</Text>
        <Text style={styles.toggleValue}>{demoMode ? "On" : "Off"}</Text>
      </Pressable>

      {showStepper && reading != null ? (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lower demo moisture"
            onPress={() => onDemoMoisture(reading - 5)}
            style={styles.step}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.stepValue}>{formatPercent(reading)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Raise demo moisture"
            onPress={() => onDemoMoisture(reading + 5)}
            style={styles.step}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.soilTitle}>
        {soil.available ? soil.soilType : "Soil data unavailable"}
      </Text>
      {soil.available ? (
        <Text style={styles.soilLine}>
          {DRAINAGE_LABEL[soil.drainage]} · Holds about {formatPercent(soil.fieldCapacity)} water
        </Text>
      ) : null}
      <Text style={styles.soilLine}>
        {soil.soilTemperature == null
          ? "Surface soil temperature unavailable"
          : `Surface soil temperature ${formatTemp(soil.soilTemperature)} (weather model)`}
      </Text>
      <Text style={[styles.note, soil.mapUnavailable && styles.noteWarn]}>{soil.note}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  demoBadge: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  liveBadge: {
    backgroundColor: colors.okSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  offlineBadge: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offlineText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  reading: {
    marginTop: 6,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  source: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  toggle: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  toggleValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  stepper: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  step: {
    width: 64,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
  },
  stepValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  divider: {
    marginTop: 14,
    height: 1,
    backgroundColor: colors.border,
  },
  soilTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  soilLine: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  note: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  noteWarn: {
    color: colors.warning,
  },
});
