import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import { fieldMapHtml } from "../components/fieldMapHtml";
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from "../components/ui";
import { useFarm } from "../context/FarmContext";
import { useLanguage } from "../context/LanguageContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { locateDevice, placeFromCoordinates } from "../services/locationService";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "FieldMap">;

type MapPoint = { latitude: number; longitude: number };

export function FieldMapScreen({ navigation }: Props) {
  const { profile, saveProfile, setDraftPlace } = useFarm();
  const { autoSetLanguageFromLocation } = useLanguage();
  useRequireSession();
  const initial = profile?.place ?? null;
  const [point, setPoint] = useState<MapPoint | null>(
    initial ? { latitude: initial.latitude, longitude: initial.longitude } : null,
  );
  const [mapCenter, setMapCenter] = useState<MapPoint>(
    initial ?? { latitude: 20.5937, longitude: 78.9629 },
  );
  const [mapToken, setMapToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const html = useMemo(
    () => fieldMapHtml(mapCenter.latitude, mapCenter.longitude, initial != null || mapToken > 0),
    [initial, mapCenter.latitude, mapCenter.longitude, mapToken],
  );

  const useGps = async () => {
    setLocating(true);
    setError(null);
    try {
      const place = await locateDevice();
      const next = { latitude: place.latitude, longitude: place.longitude };
      setPoint(next);
      setMapCenter(next);
      setMapToken((value) => value + 1);
      autoSetLanguageFromLocation(place.label || place.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this device location.");
    } finally {
      setLocating(false);
    }
  };

  const useField = async () => {
    if (!point) {
      setError("Tap the map to mark the field.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const place = await placeFromCoordinates(point.latitude, point.longitude);
      autoSetLanguageFromLocation(place.label || place.name);
      if (profile) {
        saveProfile({ ...profile, place });
        navigation.navigate("Dashboard");
        return;
      }
      setDraftPlace(place);
      navigation.navigate("FarmSetup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this field.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <AppHeader title="Field map" subtitle="Tap to mark the field" onBack={() => navigation.goBack()} />
        <View style={styles.mapFrame}>
          <WebView
            key={`${mapCenter.latitude},${mapCenter.longitude},${mapToken}`}
            originWhitelist={["*"]}
            source={{ html }}
            onMessage={(event) => {
              try {
                const body = JSON.parse(event.nativeEvent.data) as {
                  latitude?: unknown;
                  longitude?: unknown;
                };
                if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
                  return;
                }
                if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
                  return;
                }
                setPoint({ latitude: body.latitude, longitude: body.longitude });
                setError(null);
              } catch {
                setError("The map did not return a location.");
              }
            }}
            style={styles.map}
          />
        </View>
        <Text style={styles.coords}>
          {point
            ? `Latitude ${point.latitude.toFixed(5)}\nLongitude ${point.longitude.toFixed(5)}`
            : "Latitude —\nLongitude —"}
        </Text>
        <Text style={styles.note}>OpenStreetMap. Weather and soil use this point after you save it.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {locating || saving ? <ActivityIndicator color={colors.primary} /> : null}
        <SecondaryButton label="Use my location" icon="crosshairs-gps" onPress={() => void useGps()} disabled={locating || saving} />
        <PrimaryButton label="Use this field" onPress={() => void useField()} disabled={!point || saving || locating} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  mapFrame: {
    height: 340,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
    backgroundColor: colors.primarySoft,
  },
  coords: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.danger,
  },
});
