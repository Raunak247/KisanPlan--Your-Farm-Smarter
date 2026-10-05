import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CropSelector } from "../components/CropSelector";
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from "../components/ui";
import { useFarm } from "../context/FarmContext";
import { useLanguage } from "../context/LanguageContext";
import { useRequireSession } from "../hooks/useRequireSession";
import { locateDevice, searchPlaces } from "../services/locationService";
import { colors } from "../theme/colors";
import type { CropId, CropStage, Place } from "../types/farm";
import { formatCoords } from "../utils/format";
import type { RootStackParamList } from "./WelcomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "FarmSetup">;

export function FarmSetupScreen({ navigation }: Props) {
  const { profile, draftPlace, saveProfile } = useFarm();
  const { autoSetLanguageFromLocation, t } = useLanguage();
  useRequireSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Place | null>(profile?.place ?? draftPlace);
  const [crop, setCrop] = useState<CropId | null>(profile?.crop ?? null);
  const [stage, setStage] = useState<CropStage | null>(profile?.stage ?? null);

  useEffect(() => {
    const name = query.trim();
    if (name.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(name)
        .then((places) => {
          if (cancelled) {
            return;
          }
          setResults(places);
          setSearchError(places.length === 0 ? "No matching place. Try a nearby town." : null);
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          setResults([]);
          setSearchError(err instanceof Error ? err.message : "Location search failed.");
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const useDevice = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const place = await locateDevice();
      setSelected(place);
      autoSetLanguageFromLocation(place.label || place.name);
      setQuery("");
      setResults([]);
    } catch (err) {
      setLocError(err instanceof Error ? err.message : "Could not read this device location.");
    } finally {
      setLocating(false);
    }
  };

  const save = () => {
    if (!selected || !crop || !stage) {
      return;
    }
    autoSetLanguageFromLocation(selected.label || selected.name);
    saveProfile({ place: selected, crop, stage });
    navigation.navigate("Dashboard");
  };

  const ready = Boolean(selected && crop && stage);

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <AppHeader title="Your farm" subtitle="Place, crop, and stage" onBack={() => navigation.goBack()} />
        <Text style={styles.help}>
          Search any village or city. Weather uses that place on the map, not a fixed city.
        </Text>

        <Text style={styles.label}>Location</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a village or city"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          autoCorrect={false}
          maxFontSizeMultiplier={1.2}
        />
        {searching ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
        {results.map((place) => {
          const active = selected?.id === place.id;
          return (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              accessibilityLabel={place.label}
              onPress={() => {
                setSelected(place);
                Keyboard.dismiss();
              }}
              style={[styles.result, active && styles.resultOn]}
            >
              <Text style={[styles.resultName, active && styles.resultNameOn]}>{place.name}</Text>
              <Text style={[styles.resultMeta, active && styles.resultNameOn]}>{place.label}</Text>
            </Pressable>
          );
        })}

        <View style={styles.locate}>
          <SecondaryButton
            label={locating ? "Finding you..." : "Use my location"}
            icon="crosshairs-gps"
            disabled={locating}
            onPress={() => {
              void useDevice();
            }}
          />
        </View>
        {locError ? <Text style={styles.error}>{locError}</Text> : null}

        {selected ? (
          <View style={styles.selected}>
            <Text style={styles.selectedLabel}>Selected field</Text>
            <Text style={styles.selectedName}>{selected.label}</Text>
            <Text style={styles.selectedMeta}>{formatCoords(selected.latitude, selected.longitude)}</Text>
          </View>
        ) : null}

        <CropSelector crop={crop} stage={stage} onCrop={setCrop} onStage={setStage} />

        <View style={styles.save}>
          <PrimaryButton label="See my plan" onPress={save} disabled={!ready} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  help: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  input: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.textPrimary,
  },
  spinner: {
    marginTop: 10,
  },
  error: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: colors.danger,
  },
  result: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  resultOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  resultName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  resultMeta: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultNameOn: {
    color: colors.white,
  },
  locate: {
    marginTop: 12,
  },
  selected: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: colors.okSoft,
    padding: 14,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  selectedName: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  selectedMeta: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  save: {
    marginTop: 18,
  },
});
