import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Dashboard: undefined;
  FarmSetup: undefined;
  Planner: undefined;
  Alerts: undefined;
  More: undefined;
  ScanCrop: undefined;
  FieldMap: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

const features: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
}[] = [
  { icon: "sprinkler", label: "Irrigation" },
  { icon: "weather-rainy", label: "Rain alerts" },
  { icon: "barley", label: "Harvest timing" },
];

function enter(delay: number) {
  return FadeInDown.duration(500)
    .delay(delay)
    .easing(Easing.out(Easing.cubic));
}

function HeroScene() {
  return (
    <View
      style={styles.scene}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Sun, cloud, rain, a sprouting crop, and a field sensor"
    >
      <View
        style={styles.sceneArt}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.skyFrame}>
          <View style={styles.sky}>
            <View style={styles.sunGlow} />
            <View style={styles.sunWrap}>
              {SUN_RAYS.map((deg) => (
                <View
                  key={deg}
                  style={[styles.rayRing, { transform: [{ rotate: `${deg}deg` }] }]}
                >
                  <View style={styles.ray} />
                </View>
              ))}
              <View style={styles.sunDisc}>
                <View style={styles.sunCore} />
              </View>
            </View>

            <View style={styles.cloud}>
              <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
              <View style={[styles.cloudPuff, styles.cloudPuffMid]} />
              <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
              <View style={styles.cloudBase} />
            </View>

            <View style={styles.rain}>
              <View style={[styles.drop, styles.dropShort]} />
              <View style={styles.drop} />
              <View style={[styles.drop, styles.dropTall]} />
            </View>
          </View>
        </View>

        <View style={styles.hill} />
        <View style={[styles.furrow, styles.furrowA]} />
        <View style={[styles.furrow, styles.furrowB]} />
        <View style={styles.soil} />

        <View style={styles.plantRow}>
          <View style={styles.plantSlot}>
            <MaterialCommunityIcons name="barley" size={40} color={colors.primary} />
          </View>
          <View style={styles.plantSlot}>
            <MaterialCommunityIcons name="sprout" size={84} color={colors.primary} />
          </View>
          <View style={styles.plantSlot}>
            <View style={styles.sensor}>
              <MaterialCommunityIcons
                name="access-point"
                size={22}
                color={colors.accent}
              />
              <Text style={styles.sensorText}>Sensor</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function WelcomeScreen({ navigation }: Props) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress, reducedMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(progress.value * Math.PI * 2) * 6 }],
  }));

  const openLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons name="sprout" size={20} color={colors.white} />
            </View>
            <Text style={styles.wordmark}>KisanPlan</Text>
          </View>

          <View
            style={styles.langPill}
            accessibilityLabel="English"
            accessibilityHint="Hindi and Marathi will be available"
          >
            <Text style={styles.langText}>English</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </View>
        </View>

        <View style={styles.heroSlot}>
          <Animated.View style={[styles.heroShadow, floatStyle]}>
            <View style={styles.hero}>
              <HeroScene />
            </View>
          </Animated.View>
        </View>

        <Animated.Text
          entering={reducedMotion ? undefined : enter(100)}
          style={styles.headline}
          accessibilityRole="header"
          numberOfLines={3}
          maxFontSizeMultiplier={1.2}
        >
          Know what to do on your farm, every day
        </Animated.Text>

        <Animated.Text
          entering={reducedMotion ? undefined : enter(200)}
          style={styles.subtitle}
          numberOfLines={3}
          maxFontSizeMultiplier={1.2}
        >
          Weather-based advice for irrigation, spraying and harvest – for your crop and your village.
        </Animated.Text>

        <Animated.View
          entering={reducedMotion ? undefined : enter(200)}
          style={styles.pills}
        >
          {features.map((feature) => (
            <View key={feature.label} style={styles.pill}>
              <MaterialCommunityIcons
                name={feature.icon}
                size={15}
                color={colors.accent}
              />
              <Text
                style={styles.pillLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.1}
              >
                {feature.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : enter(200)}
          style={styles.dots}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : enter(300)}
          style={styles.footer}
        >
          <Pressable
            onPress={openLogin}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>
              Get Started
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={styles.loginMuted} maxFontSizeMultiplier={1.2}>
              Already have an account?{" "}
            </Text>
            <Pressable
              onPress={openLogin}
              hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              style={({ pressed }) => (pressed ? styles.loginPressed : null)}
            >
              <Text style={styles.loginLink} maxFontSizeMultiplier={1.2}>
                Log in
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  header: {
    minHeight: 48,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    flexShrink: 1,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 12,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  langText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  heroSlot: {
    flex: 1,
    marginTop: 8,
    paddingVertical: 8,
  },
  heroShadow: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  hero: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scene: {
    flex: 1,
  },
  sceneArt: {
    ...StyleSheet.absoluteFill,
  },
  skyFrame: {
    position: "absolute",
    top: "4%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  sky: {
    width: 236,
    height: 150,
  },
  sunGlow: {
    position: "absolute",
    top: -28,
    left: -18,
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: colors.accentGlow,
  },
  sunWrap: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 96,
    height: 96,
  },
  rayRing: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
  },
  ray: {
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sunDisc: {
    position: "absolute",
    top: 22,
    left: 22,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sunCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  cloud: {
    position: "absolute",
    top: 20,
    left: 78,
    width: 140,
    height: 72,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cloudPuff: {
    position: "absolute",
    backgroundColor: colors.card,
  },
  cloudPuffLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    top: 14,
    left: 10,
  },
  cloudPuffMid: {
    width: 58,
    height: 58,
    borderRadius: 29,
    top: 0,
    left: 36,
  },
  cloudPuffRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    top: 18,
    left: 80,
  },
  cloudBase: {
    position: "absolute",
    width: 112,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    bottom: 0,
    left: 12,
  },
  rain: {
    position: "absolute",
    top: 102,
    left: 124,
    width: 62,
    height: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  drop: {
    width: 5,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  dropShort: {
    height: 8,
  },
  dropTall: {
    height: 16,
  },
  hill: {
    position: "absolute",
    left: -20,
    right: -20,
    bottom: -12,
    height: "46%",
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: colors.primarySoft,
  },
  furrow: {
    position: "absolute",
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primarySoil,
  },
  furrowA: {
    left: "12%",
    width: "18%",
    bottom: "16%",
  },
  furrowB: {
    left: "14%",
    width: "14%",
    bottom: "11%",
  },
  soil: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: "8%",
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primarySoil,
  },
  plantRow: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: "9%",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  plantSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sensor: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sensorText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  pills: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    flex: 1,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  pillLabel: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dots: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondaryMuted,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accent,
  },
  footer: {
    marginTop: 14,
  },
  cta: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  loginRow: {
    marginTop: 12,
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginMuted: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  loginPressed: {
    opacity: 0.6,
  },
});
