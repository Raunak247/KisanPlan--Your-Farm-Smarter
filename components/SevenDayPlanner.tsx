import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { DayPlan } from "../logic/plannerLogic";
import { colors } from "../theme/colors";
import { formatMm, formatPercent, formatTemp, shortWeekday } from "../utils/format";
import { GlassCard } from "./ui";

function conditionIcon(condition: DayPlan["condition"]) {
  if (condition === "rainy") {
    return "weather-rainy" as const;
  }
  if (condition === "cloudy") {
    return "weather-cloudy" as const;
  }
  return "weather-sunny" as const;
}

function DayRow({ day }: { day: DayPlan }) {
  const spray = day.spray.advice === "DO_NOT_SPRAY" ? "Don't spray" : "Spray ok";
  const water = day.irrigation.decided ? (day.irrigation.motor === "ON" ? "Irrigate" : "No water") : "No sensor";

  return (
    <View style={styles.row}>
      <Text style={styles.rowDay}>{shortWeekday(day.weekday)}</Text>
      <Text style={styles.rowMid}>
        {formatTemp(day.temperatureMax)} · Rain {formatPercent(day.rainProbability)}
      </Text>
      <Text style={styles.rowEnd}>
        {water}
        {"\n"}
        {spray}
      </Text>
    </View>
  );
}

export function SevenDayPlanner({
  days,
  advisorDaily,
  compact,
  onOpen,
}: {
  days: DayPlan[];
  advisorDaily?: string[] | null;
  compact?: boolean;
  onOpen?: () => void;
}) {
  if (compact) {
    return (
      <GlassCard>
        <Text style={styles.kicker}>7-day plan</Text>
        <Text style={styles.estimateNote}>
          Today uses the sensor. Later days estimate moisture after rain or irrigation.
        </Text>
        <View style={styles.list}>
          {days.map((day) => (
            <DayRow key={day.date} day={day} />
          ))}
        </View>
        {onOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the full 7-day plan"
            onPress={onOpen}
            style={styles.open}
          >
            <Text style={styles.openText}>Open full week</Text>
          </Pressable>
        ) : null}
      </GlassCard>
    );
  }

  return (
    <View style={styles.full}>
      {days.map((day, index) => {
        const advisor = advisorDaily && advisorDaily.length === days.length ? advisorDaily[index] : null;
        return (
          <GlassCard key={day.date} style={styles.dayCard}>
            <Text style={styles.weekday}>{day.weekday}</Text>
            <View style={styles.tempRow}>
              <MaterialCommunityIcons
                name={conditionIcon(day.condition)}
                size={28}
                color={colors.accent}
              />
              <Text style={styles.temp}>{formatTemp(day.temperatureMax)}</Text>
            </View>
            <Text style={styles.meta}>
              {formatTemp(day.temperatureMin)} to {formatTemp(day.temperatureMax)} · Humidity{" "}
              {formatPercent(day.humidityMean)}
            </Text>
            <Text style={styles.meta}>
              Rain {formatPercent(day.rainProbability)} · {formatMm(day.rainfallMm)} · Wind{" "}
              {Math.round(day.windSpeed)} km/h
            </Text>
            <Text style={styles.decision}>
              Irrigation: {day.irrigation.decided ? day.irrigation.motor : "Not decided"}
            </Text>
            <Text style={styles.decision}>Spray: {day.spray.label}</Text>
            <Text style={styles.action}>{advisor ?? day.action}</Text>
            <Text style={styles.moisture}>
              {day.moistureUsed == null
                ? "No moisture reading"
                : day.moistureIsEstimate
                  ? `Estimated moisture ${Math.round(day.moistureUsed)}%`
                  : `Sensor moisture ${Math.round(day.moistureUsed)}%`}
            </Text>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  estimateNote: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  list: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDay: {
    width: 42,
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  rowMid: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  rowEnd: {
    width: 108,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  open: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  openText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  full: {
    gap: 12,
  },
  dayCard: {
    marginBottom: 0,
  },
  weekday: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  tempRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  temp: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  meta: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  decision: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  action: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  moisture: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
