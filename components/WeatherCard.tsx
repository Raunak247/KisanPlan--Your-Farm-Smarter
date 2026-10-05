import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { DayPlan } from "../logic/plannerLogic";
import type { WeatherReport } from "../services/weatherService";
import { colors } from "../theme/colors";
import { formatMm, formatPercent, formatTemp } from "../utils/format";
import { GlassCard } from "./ui";

function conditionIcon(condition: DayPlan["condition"] | undefined) {
  if (condition === "rainy") {
    return "weather-rainy" as const;
  }
  if (condition === "cloudy") {
    return "weather-cloudy" as const;
  }
  return "weather-sunny" as const;
}

export function WeatherCard({
  weather,
  today,
}: {
  weather: WeatherReport;
  today?: DayPlan;
}) {
  const rainChance = today?.rainProbability ?? weather.current.rainProbability;
  const rainfall = today?.rainfallMm ?? 0;

  return (
    <GlassCard>
      <Text style={styles.kicker}>Current weather</Text>
      <View style={styles.tempRow}>
        <MaterialCommunityIcons
          name={conditionIcon(today?.condition)}
          size={42}
          color={colors.accent}
        />
        <Text style={styles.temp} maxFontSizeMultiplier={1.2}>
          {formatTemp(weather.current.temperature)}
        </Text>
      </View>
      <Text style={styles.line} maxFontSizeMultiplier={1.2}>
        Humidity {formatPercent(weather.current.humidity)}
      </Text>
      <Text style={styles.line} maxFontSizeMultiplier={1.2}>
        Rain chance today {formatPercent(rainChance)}
      </Text>
      <Text style={styles.line} maxFontSizeMultiplier={1.2}>
        Rain today {formatMm(rainfall)} · Wind {Math.round(weather.current.windSpeed)} km/h
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  tempRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  temp: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  line: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  },
});
