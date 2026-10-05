import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFarm } from "../context/FarmContext";
import type { RootStackParamList } from "./WelcomeScreen";
import { colors } from "../theme/colors";
import { AppHeader, PrimaryButton, Screen } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

function contactLooksValid(value: string): boolean {
  const trimmed = value.trim();
  const email = trimmed.includes("@") && trimmed.includes(".") && trimmed.length >= 5;
  const phone = trimmed.replace(/\D/g, "").length >= 10;
  return email || phone;
}

export function LoginScreen({ navigation }: Props) {
  const { session, signIn } = useFarm();
  const [creating, setCreating] = useState(false);
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    }
  }, [navigation, session]);

  const submit = () => {
    if (!contactLooksValid(contact)) {
      setError("Enter a phone number or an email.");
      return;
    }
    if (password.trim().length < 4) {
      setError("Use a password of at least 4 characters.");
      return;
    }
    setError(null);
    signIn(contact.trim());
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <AppHeader title="KisanPlan" onBack={() => navigation.goBack()} />
          <Text style={styles.headline} accessibilityRole="header">
            {creating ? "Create account" : "Log in"}
          </Text>
          <Text style={styles.help}>
            This demo keeps your login on this phone for this session. Nothing is sent to a server.
          </Text>

          <Text style={styles.label}>Phone or email</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            placeholder="98xxxxxxxx or you@farm.com"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            maxFontSizeMultiplier={1.2}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            placeholder="At least 4 characters"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            maxFontSizeMultiplier={1.2}
          />

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <View style={styles.submit}>
            <PrimaryButton label={creating ? "Create account" : "Log in"} onPress={submit} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setCreating((value) => !value);
              setError(null);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {creating ? "Already have an account? Log in" : "New here? Create account"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headline: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  help: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  label: {
    marginTop: 18,
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
  error: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    color: colors.danger,
  },
  submit: {
    marginTop: 20,
  },
  switch: {
    marginTop: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  switchText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
});
