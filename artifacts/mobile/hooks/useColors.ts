import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  const hasDark = "dark" in colors && typeof (colors as any).dark === "object";
  const palette = scheme === "dark" && hasDark
    ? (colors as any).dark as typeof colors.light
    : colors.light;
  return { ...palette, radius: colors.radius };
}
