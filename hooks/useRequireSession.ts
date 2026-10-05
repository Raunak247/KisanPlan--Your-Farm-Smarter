import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { useFarm } from "../context/FarmContext";
import type { RootStackParamList } from "../screens/WelcomeScreen";

export function useRequireSession() {
  const { session } = useFarm();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!session) {
      navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
    }
  }, [navigation, session]);
}
