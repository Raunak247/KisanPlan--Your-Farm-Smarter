import { StyleSheet, Text, View } from "react-native";
import type { MotorReport } from "../services/sensorService";
import { colors } from "../theme/colors";
import { GlassCard } from "./ui";

function clock(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function duration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remain = total % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remain}s`;
  }
  return `${remain}s`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function MotorStatsCard({ report }: { report: MotorReport | null }) {
  const stats = report?.statistics ?? null;

  return (
    <GlassCard>
      <Text style={styles.kicker}>Motor statistics</Text>
      {!report || !stats ? (
        <Text style={styles.empty}>Statistics appear after the ESP32 sends a pump state.</Text>
      ) : (
        <View style={styles.list}>
          <Row label="Current status" value={stats.status ?? "—"} />
          <Row label="Total ON time" value={duration(stats.totalOnSeconds)} />
          <Row label="Times turned ON" value={String(stats.onCount)} />
          <Row label="Last ON" value={clock(stats.lastOnAt)} />
          <Row label="Last OFF" value={clock(stats.lastOffAt)} />
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
  empty: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  list: {
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "right",
  },
});
