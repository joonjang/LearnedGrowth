import { palette } from "./colors";

export const typography = {
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: palette.text,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#444",
  },
  body: {
    fontSize: 14,
    color: palette.text,
  },
  caption: {
    fontSize: 12,
    color: palette.hint,
  },
  chip: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
} as const;
