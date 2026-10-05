/**
 * KisanPlan colors. Every color used in the app lives here.
 * Opacity values are derived from the palette above.
 */
export const colors = {
  primary: "#1E4D2B",
  accent: "#48A14D",
  background: "#F8F9F5",
  card: "#FFFFFF",
  textPrimary: "#1A201C",
  textSecondary: "#5A655C",

  white: "#FFFFFF",
  /** Accent at 12% — hero card wash. */
  accentSoft: "rgba(72, 161, 77, 0.12)",
  /** Accent at 22% — sun glow on the hero wash. */
  accentGlow: "rgba(72, 161, 77, 0.22)",
  /** Primary at 14% — field hill. */
  primarySoft: "rgba(30, 77, 43, 0.14)",
  /** Primary at 28% — soil line and furrows. */
  primarySoil: "rgba(30, 77, 43, 0.28)",
  /** textSecondary at 30% — inactive pagination dots. */
  textSecondaryMuted: "rgba(90, 101, 92, 0.30)",
  /** Charcoal at 10% — hairline borders. */
  border: "rgba(26, 32, 28, 0.10)",

  danger: "#8E2A2A",
  dangerSoft: "rgba(142, 42, 42, 0.12)",
  warning: "#8A5A00",
  warningSoft: "rgba(138, 90, 0, 0.16)",
  okSoft: "rgba(72, 161, 77, 0.16)",
  /** Near-white card so text stays readable in sun. */
  glass: "rgba(255, 255, 255, 0.88)",
  glassBorder: "rgba(255, 255, 255, 0.96)",
} as const;
