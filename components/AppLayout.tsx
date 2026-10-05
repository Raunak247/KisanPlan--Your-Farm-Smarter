import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BottomNavigation, isMainTab, type MainTab } from "./BottomNavigation";

export function AppLayout({
  children,
  routeName,
  onSelect,
}: {
  children: ReactNode;
  routeName: string | undefined;
  onSelect: (tab: MainTab) => void;
}) {
  const active = isMainTab(routeName) ? routeName : null;

  return (
    <View style={styles.root}>
      {children}
      {active ? <BottomNavigation active={active} onSelect={onSelect} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
