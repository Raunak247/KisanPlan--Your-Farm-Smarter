import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { CROPS, STAGES, type CropId, type CropStage } from "../types/farm";

export function CropSelector({
  crop,
  stage,
  onCrop,
  onStage,
}: {
  crop: CropId | null;
  stage: CropStage | null;
  onCrop: (crop: CropId) => void;
  onStage: (stage: CropStage) => void;
}) {
  return (
    <View>
      <Text style={styles.heading}>Crop</Text>
      <View style={styles.grid}>
        {CROPS.map((item) => {
          const selected = crop === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected }}
              onPress={() => onCrop(item.id)}
              style={[styles.crop, selected && styles.selected]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={selected ? colors.white : colors.accent}
              />
              <Text style={[styles.cropText, selected && styles.selectedText]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.heading}>Crop stage</Text>
      {STAGES.map((item) => {
        const selected = stage === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected }}
            onPress={() => onStage(item.id)}
            style={[styles.stage, selected && styles.selected]}
          >
            <Text style={[styles.stageName, selected && styles.selectedText]}>{item.name}</Text>
            <Text style={[styles.stageHint, selected && styles.selectedHint]}>{item.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  crop: {
    width: "48%",
    marginBottom: 8,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  cropText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  stage: {
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  stageName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  stageHint: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedText: {
    color: colors.white,
  },
  selectedHint: {
    color: "rgba(255,255,255,0.86)",
  },
});
