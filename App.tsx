import React, { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLayout } from "./components/AppLayout";
import { isMainTab } from "./components/BottomNavigation";
import { LanguageProvider } from "./context/LanguageContext";
import { FarmProvider } from "./context/FarmContext";
import { PlanProvider } from "./context/PlanContext";
import { AlertsScreen } from "./screens/AlertsScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { FarmSetupScreen } from "./screens/FarmSetupScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { FieldMapScreen } from "./screens/FieldMapScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { PlannerScreen } from "./screens/PlannerScreen";
import { ScanCropScreen } from "./screens/ScanCropScreen";
import {
  WelcomeScreen,
  type RootStackParamList,
} from "./screens/WelcomeScreen";
import { colors } from "./theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
};

type BoundaryState = { message: string | null };

class AppErrorBoundary extends React.Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return { message };
  }

  render() {
    if (this.state.message) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>This screen hit a problem.</Text>
          <Text style={styles.errorBody}>{this.state.message}</Text>
          <Pressable
            onPress={() => this.setState({ message: null })}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootNavigation() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [routeName, setRouteName] = useState<string | undefined>("Welcome");

  const syncRoute = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name) {
      setRouteName(name);
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={syncRoute}
      onStateChange={syncRoute}
    >
      <AppLayout
        routeName={routeName}
        onSelect={(tab) => {
          if (tab !== routeName && isMainTab(tab)) {
            navigationRef.navigate(tab);
          }
        }}
      >
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="FarmSetup" component={FarmSetupScreen} />
          <Stack.Screen name="Planner" component={PlannerScreen} />
          <Stack.Screen name="Alerts" component={AlertsScreen} />
          <Stack.Screen name="More" component={MoreScreen} />
          <Stack.Screen name="ScanCrop" component={ScanCropScreen} />
          <Stack.Screen name="FieldMap" component={FieldMapScreen} />
        </Stack.Navigator>
      </AppLayout>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LanguageProvider>
          <FarmProvider>
            <PlanProvider>
              <RootNavigation />
            </PlanProvider>
          </FarmProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  errorBody: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  errorButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
