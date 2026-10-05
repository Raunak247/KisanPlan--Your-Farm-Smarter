import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CropScan } from "../services/predictService";
import { colors } from "../theme/colors";
import { GlassCard } from "./ui";

export function CropCheckCard({
  scan,
  onScan,
  onMap,
}: {
  scan: CropScan | null;
  onScan: () => void;
  onMap: () => void;
}) {
  const isHealthy = scan?.status?.includes("HEALTHY") ?? false;

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Crop health status</Text>
        {scan ? (
          <View style={[styles.badge, isHealthy ? styles.badgeOk : styles.badgeDanger]}>
            <Text style={[styles.badgeText, isHealthy ? styles.badgeTextOk : styles.badgeTextDanger]}>
              {scan.status}
            </Text>
          </View>
        ) : null}
      </View>

      {scan ? (
        <View style={styles.details}>
          <Text style={styles.line}>Crop: {scan.crop}</Text>
          <Text style={styles.line}>Detected: {scan.detected}</Text>
          <Text style={styles.line}>
            Confidence: {scan.confidencePct ?? `${Math.round(scan.confidence * 100)}%`}{" "}
            <Text style={styles.levelText}>({scan.confidenceLevel ?? "HIGH"})</Text>
          </Text>
          {scan.treatment && scan.treatment.length > 0 ? (
            <Text style={styles.note} numberOfLines={2}>
              Treatment: {scan.treatment[0]}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.note}>Take or choose a leaf photo to check the crop.</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan crop"
          onPress={onScan}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{scan ? "View Full Analysis / Re-scan" : "Scan crop"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Field map"
          onPress={onMap}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Field map</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOk: {
    backgroundColor: colors.okSoft,
  },
  badgeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  badgeTextOk: {
    color: colors.accent,
  },
  badgeTextDanger: {
    color: colors.danger,
  },
  details: {
    marginTop: 6,
  },
  line: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  note: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
});
