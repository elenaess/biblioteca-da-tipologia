import React from "react";
import Svg, { Circle, Path, Rect, Polyline, Line } from "react-native-svg";

/* Paths follow Lucide's ISC-licensed icon designs.
 * Copyright (c) Lucide Icons and Contributors — https://lucide.dev/license
 * Permission to use, copy, modify, and distribute, with this copyright and license notice.
 * Provided "AS IS", without any warranty.
 */
const paths: Record<string, React.ReactNode> = {
  "arrow-back": <><Path d="m12 19-7-7 7-7" /><Path d="M19 12H5" /></>,
  "arrow-forward": <><Path d="M5 12h14" /><Path d="m12 5 7 7-7 7" /></>,
  "pencil-outline": <><Path d="m16 5 3 3" /><Path d="M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11z" /></>,
  pencil: <><Path d="M12 20h9" /><Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  "person-outline": <><Circle cx="12" cy="8" r="4" /><Path d="M20 21a8 8 0 0 0-16 0" /></>,
  "book-outline": <><Path d="M12 7v14" /><Path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></>,
  "search-outline": <><Circle cx="11" cy="11" r="8" /><Path d="m21 21-4.35-4.35" /></>,
  checkmark: <Path d="m20 6-11 11-5-5" />,
  "shield-checkmark-outline": <><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><Path d="m9 12 2 2 4-4" /></>,
  "log-out-outline": <><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Path d="m16 17 5-5-5-5" /><Path d="M21 12H9" /></>,
  "external-link": <><Path d="M15 3h6v6" /><Path d="M10 14 21 3" /><Path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /></>,
};
export default function AppIcon({ name, size = 22, color = "#594a3b" }: {name: string; size?: number; color?: string}) {
  return <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {paths[name] ?? paths["book-outline"]}
  </Svg>;
}
