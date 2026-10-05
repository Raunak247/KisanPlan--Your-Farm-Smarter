import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const MAIN_TABS = ["Dashboard", "Planner", "Alerts", "More"] as const;

export type MainTab = (typeof MAIN_TABS)[number];

/** Extra scroll space so the last row clears the floating dock. */
export const BOTTOM_NAV_CLEARANCE = 120;

export function isMainTab(name: string | undefined): name is MainTab {
  return name === "Dashboard" || name === "Planner" || name === "Alerts" || name === "More";
}

const ITEMS: {
  id: MainTab;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "Dashboard", label: "Home", icon: "home-outline" },
  { id: "Planner", label: "Planner", icon: "document-text-outline" },
  { id: "Alerts", label: "Alerts", icon: "heart-outline" },
  { id: "More", label: "More" },
];

function MoreIcon({ color }: { color: string }) {
  return (
    <View style={styles.dots}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

export function BottomNavigation({
  active,
  onSelect,
}: {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom > 0 ? insets.bottom + 8 : 24;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.capsule}>
        {ITEMS.map((item) => {
          const selected = item.id === active;
          const color = selected ? "#1A201C" : "#F4F6F2";
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.id)}
              hitSlop={4}
              android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
              style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]}
            >
              <View style={selected ? styles.activeCircle : styles.idleSlot}>
                {item.icon ? (
                  <Ionicons name={item.icon} size={22} color={color} />
                ) : (
                  <MoreIcon color={color} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },
  capsule: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#1A201C",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  slot: {
    flex: 1,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  slotPressed: {
    opacity: 0.72,
  },
  activeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  idleSlot: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    width: 16,
    height: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
