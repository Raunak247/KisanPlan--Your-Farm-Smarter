import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "./ui";
import { colors } from "../theme/colors";

type Freshness = "fresh" | "stale" | "none";
type Source = "network" | "cache" | null;

type Props = {
  weatherFreshness: Freshness;
  soilFreshness: Freshness;
  weatherSource: Source;
  soilSource: Source;
  moistureSource: string;
  moistureStatus?: string;
};

function label(source: Source, freshness: Freshness): string {
  if (source === "cache" && freshness === "stale") {
    return "STALE DATA";
  }
  if (source === "cache") {
    return "CACHED";
  }
  if (source === "network" && freshness === "fresh") {
    return "LIVE";
  }
  return "UNAVAILABLE";
}

function tone(value: string): string {
  if (value === "STALE DATA") {
    return colors.warning;
  }
  if (value === "UNAVAILABLE") {
    return colors.danger;
  }
  return colors.primary;
}

export function DataAvailabilityCard({
  weatherFreshness,
  soilFreshness,
  weatherSource,
  soilSource,
  moistureSource,
  moistureStatus,
}: Props) {
  const weatherLabel = label(weatherSource, weatherFreshness);
  const soilLabel = label(soilSource, soilFreshness);
  const sensorLabel = moistureStatus === "offline" ? "SENSOR OFFLINE" : moistureSource.toUpperCase();

  return (
    <GlassCard>
      <Text style={styles.title}>Data status</Text>
      <View style={styles.row}>
        <Status label="Weather" value={weatherLabel} />
        <Status label="Soil map" value={soilLabel} />
        <Status label="Sensor" value={sensorLabel} />
      </View>
    </GlassCard>
  );
}

function Status({ label: name, value }: { label: string; value: string }) {
  return (
    <View style={styles.status}>
      <Text style={styles.label}>{name}</Text>
      <Text style={[styles.value, { color: tone(value) }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  status: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    fontWeight: "800",
  },
});
