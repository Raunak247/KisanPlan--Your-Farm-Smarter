import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LanguageSelectorPill } from "./LanguageSelector";
import { colors } from "../theme/colors";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.wash}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      {icon ? <Ionicons name={icon} size={20} color={colors.white} /> : null}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      ) : null}
      <Text style={styles.secondaryText} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  onRefresh,
  refreshing,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={8}
            style={styles.iconButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.logoMark}>
            <MaterialCommunityIcons name="sprout" size={18} color={colors.white} />
          </View>
        )}
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.2} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>
        <LanguageSelectorPill />
        {onRefresh ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh weather"
            onPress={onRefresh}
            hitSlop={8}
            style={styles.iconButton}
          >
            {refreshing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.primary} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wash: {
    ...StyleSheet.absoluteFill,
  },
  blobA: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentSoft,
  },
  blobB: {
    position: "absolute",
    bottom: 40,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
  },
  body: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  button: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  secondary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  headerSide: {
    width: 42,
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
