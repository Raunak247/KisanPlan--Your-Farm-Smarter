import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import {
  AppHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "../components/ui";
import { useFarm } from "../context/FarmContext";
import { usePlan } from "../context/PlanContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { predictCropImage, type CropScan } from "../services/predictService";
import {
  getFertilizerRecommendation,
  type FertilizerResult,
} from "../services/fertilizerService";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "ScanCrop">;

export function ScanCropScreen({ navigation }: Props) {
  const { setScan, scan: savedScan, profile } = useFarm();
  const { plan, moisture } = usePlan();
  useRequireSession();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CropScan | null>(savedScan);
  const [fertilizerResult, setFertilizerResult] = useState<FertilizerResult | null>(null);

  const takePhoto = async (useCamera: boolean) => {
    setError(null);
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Camera permission is needed to photograph the crop. You can still choose a saved photo.",
        );
        return;
      }
    } else {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo permission is needed to choose a saved picture.");
        return;
      }
    }
    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          base64: true,
        });
    if (picked.canceled || !picked.assets[0]) {
      return;
    }
    const asset = picked.assets[0];
    if (!asset.base64) {
      setError("This photo could not be prepared. Try another one.");
      return;
    }
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64);
    setResult(null);
  };

  // ── Helpers to derive real values from app context ───────────────────────
  const currentSeason = (): string => {
    const month = new Date().getMonth() + 1; // 1–12
    if (month >= 6 && month <= 10) return "Kharif";   // Jun–Oct
    if (month >= 11 || month <= 3) return "Rabi";     // Nov–Mar
    return "Zaid";                                     // Apr–May
  };

  const stageToLabel = (stage: string): string => {
    const map: Record<string, string> = {
      germination: "Sowing",
      vegetative:  "Vegetative",
      flowering:   "Flowering",
      fruiting:    "Fruiting",
      maturity:    "Maturity",
    };
    return map[stage] ?? "Vegetative";
  };

  const detect = async () => {
    if (!photoBase64) {
      setError("Take a photo or choose one first.");
      return;
    }
    setBusy(true);
    setError(null);
    setFertilizerResult(null);
    try {
      const prediction = await predictCropImage(photoBase64);
      setResult(prediction);
      setScan(prediction);

      // ── Real values from app context ──────────────────────────────────────
      const todayWeather   = plan?.days[0];
      const liveMoisture   = moisture?.moisture;          // IoT sensor (real)
      const farmStage      = profile?.stage ?? "vegetative";
      const farmSeason     = currentSeason();             // calendar month (real)

      getFertilizerRecommendation({
        // ✅ Real — from photo scan
        Crop_Type:          prediction.crop,
        // ✅ Real — from farm profile stage
        Crop_Growth_Stage:  stageToLabel(farmStage),
        // ✅ Real — from live weather API
        Temperature:        todayWeather?.temperatureMax ?? 28,
        Humidity:           todayWeather?.humidityMean   ?? 65,
        Rainfall:           todayWeather?.rainfallMm     ?? 1200,
        // ✅ Real — from IoT sensor (falls back to 40 if hardware not connected)
        Soil_Moisture:      liveMoisture ?? 40,
        // ✅ Real — from calendar
        Season:             farmSeason,
        // ── Defaults (hardware/soil test needed for these) ──────────────────
        Soil_pH:            6.5,
        Organic_Carbon:     0.8,
        Electrical_Conductivity: 1.2,
        Nitrogen_Level:     80,
        Phosphorus_Level:   40,
        Potassium_Level:    60,
        Fertilizer_Used_Last_Season: 150,
        Yield_Last_Season:  4.0,
        Soil_Type:          "Loamy",
        Irrigation_Type:    "Canal",
        Previous_Crop:      "Wheat",
        Region:             "Central",
      })
        .then(setFertilizerResult)
        .catch(() => {/* silently ignore if fertilizer API is unavailable */});

    } catch (err) {
      setError(err instanceof Error ? err.message : "The crop check failed.");
    } finally {
      setBusy(false);
    }
  };

  const todaySpray = plan?.days[0]?.spray;
  const effectiveSprayingSuitability = todaySpray
    ? todaySpray.advice === "SUITABLE"
      ? "SUITABLE"
      : "DO NOT SPRAY"
    : result?.sprayingSuitability || "CHECK";

  const effectiveSprayingReason = todaySpray
    ? todaySpray.reason
    : result?.sprayingReason || "Weather conditions required before spraying";


  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Scan crop"
          subtitle="Photo & disease detection"
          onBack={() => navigation.goBack()}
        />
        <Text style={styles.help}>
          Photograph a single leaf in clear lighting, or pick an existing image
          from your device.
        </Text>

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : null}

        <View style={styles.buttonRow}>
          <View style={styles.halfBtn}>
            <SecondaryButton
              label="Take photo"
              icon="camera"
              onPress={() => void takePhoto(true)}
              disabled={busy}
            />
          </View>
          <View style={styles.halfBtn}>
            <SecondaryButton
              label="Choose photo"
              icon="image"
              onPress={() => void takePhoto(false)}
              disabled={busy}
            />
          </View>
        </View>

        <PrimaryButton
          label={busy ? "Analyzing crop health..." : "Detect disease"}
          onPress={() => void detect()}
          disabled={busy || !photoBase64}
        />

        {busy ? <ActivityIndicator size="large" color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <View style={styles.analysisCard}>
            {/* Header Banner */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>CROP HEALTH ANALYSIS</Text>
            </View>

            {/* Metrics Section */}
            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Crop:</Text>
                <Text style={styles.rowValue}>{result.crop}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Detected:</Text>
                <Text style={[styles.rowValue, styles.detectedValue]}>
                  {result.detected}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Confidence:</Text>
                <Text style={styles.rowValue}>{result.confidencePct}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Status:</Text>
                <View
                  style={[
                    styles.statusPill,
                    result.status.includes("HEALTHY")
                      ? styles.statusPillOk
                      : styles.statusPillDanger,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      result.status.includes("HEALTHY")
                        ? styles.statusPillTextOk
                        : styles.statusPillTextDanger,
                    ]}
                  >
                    {result.status}
                  </Text>
                </View>
              </View>

              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={styles.rowLabel}>Confidence Level:</Text>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>
                    {result.confidenceLevel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Treatment & Prevention */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>TREATMENT</Text>
              {result.treatment.map((item, idx) => (
                <View key={`treatment-${idx}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
                PREVENTION
              </Text>
              {result.prevention.map((item, idx) => (
                <View key={`prevention-${idx}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Spraying Suitability */}
            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Spraying suitability:</Text>
                <Text
                  style={[
                    styles.rowValue,
                    effectiveSprayingSuitability === "SUITABLE"
                      ? styles.sprayingOk
                      : effectiveSprayingSuitability === "DO NOT SPRAY"
                      ? styles.sprayingDanger
                      : styles.sprayingCheck,
                  ]}
                >
                  {effectiveSprayingSuitability}
                </Text>
              </View>

              <View style={[styles.row, { alignItems: "flex-start", marginTop: 4 }]}>
                <Text style={styles.rowLabel}>Reason:</Text>
                <Text style={[styles.rowValue, styles.reasonText]}>
                  {effectiveSprayingReason}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Fertilizer Recommendation Card */}
        {fertilizerResult ? (
          <View style={styles.fertCard}>
            <View style={styles.fertHeader}>
              <Text style={styles.fertTitle}>FERTILIZER RECOMMENDATION</Text>
            </View>
            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Recommended:</Text>
                <View style={styles.fertPill}>
                  <Text style={styles.fertPillText}>
                    {fertilizerResult.recommended_fertilizer}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Confidence:</Text>
                <Text style={[styles.rowValue, { color: colors.primary, fontWeight: "800" }]}>
                  {fertilizerResult.confidence_pct}
                </Text>
              </View>
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text style={styles.rowLabel}>Level:</Text>
                <Text style={[
                  styles.rowValue,
                  fertilizerResult.confidence_level === "HIGH"
                    ? styles.sprayingOk
                    : fertilizerResult.confidence_level === "MODERATE"
                    ? styles.sprayingCheck
                    : styles.sprayingDanger,
                ]}>
                  {fertilizerResult.confidence_level}
                </Text>
              </View>

              {fertilizerResult.top_k.length > 1 ? (
                <>
                  <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
                    OTHER OPTIONS
                  </Text>
                  {fertilizerResult.top_k.slice(1).map((item) => (
                    <View key={item.rank} style={styles.fertOption}>
                      <Text style={styles.fertOptionName}>{item.fertilizer}</Text>
                      <Text style={styles.fertOptionConf}>{item.confidence_pct}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  help: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
  error: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.danger,
    paddingHorizontal: 4,
  },
  analysisCard: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.white,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "right",
    flex: 1.3,
  },
  detectedValue: {
    color: colors.primary,
    fontWeight: "800",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillOk: {
    backgroundColor: colors.okSoft,
  },
  statusPillDanger: {
    backgroundColor: colors.dangerSoft,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusPillTextOk: {
    color: colors.accent,
  },
  statusPillTextDanger: {
    color: colors.danger,
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  levelPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.primary,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
    marginRight: 8,
    fontWeight: "800",
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    flex: 1,
  },
  sprayingOk: {
    color: colors.accent,
  },
  sprayingDanger: {
    color: colors.danger,
  },
  sprayingCheck: {
    color: colors.warning,
  },
  reasonText: {
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  fertCard: {
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  fertHeader: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
    alignItems: "center",
  },
  fertTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: colors.primary,
  },
  fertPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  fertPillText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.4,
  },
  fertOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fertOptionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  fertOptionConf: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
