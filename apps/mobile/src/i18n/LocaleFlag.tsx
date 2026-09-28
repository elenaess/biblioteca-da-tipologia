import React from "react";
import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, Rect } from "react-native-svg";
import type { Locale } from "../../../../packages/domain/src";

export default function LocaleFlag({ locale, size = 44 }: { locale: Locale; size?: number }) {
  const clipId = `locale-flag-${locale}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Defs>
        <ClipPath id={clipId}><Circle cx="32" cy="32" r="32" /></ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {locale === "pt" ? (
          <>
            <Rect width="64" height="64" fill="#039B3A" />
            <Polygon points="32,10 54,32 32,54 10,32" fill="#FFDF00" />
            <Circle cx="32" cy="32" r="12" fill="#1F2B88" />
            <Path d="M22 29.5c7.5-2.8 14.5-2.8 20 0" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
          </>
        ) : locale === "en" ? (
          <>
            <Rect width="64" height="64" fill="#FFFFFF" />
            {[0, 10, 20, 30, 40, 50, 60].map((y) => <Rect key={y} x="0" y={y} width="64" height="5" fill="#C83B32" />)}
            <Rect x="0" y="0" width="30" height="28" fill="#22408C" />
            {[6, 13, 20].flatMap((y, row) => [5, 11.5, 18, 24.5].map((x, col) => (
              <Circle key={`${row}-${col}`} cx={x + (row % 2 ? 3 : 0)} cy={y} r="1.2" fill="#FFFFFF" />
            )))}
          </>
        ) : (
          <>
            <Rect x="0" y="0" width="21.34" height="64" fill="#1F8B4C" />
            <Rect x="21.33" y="0" width="21.34" height="64" fill="#FFFFFF" />
            <Rect x="42.66" y="0" width="21.34" height="64" fill="#D5423A" />
            <Circle cx="32" cy="32" r="4.2" fill="#B7852D" />
            <Circle cx="32" cy="32" r="2.1" fill="#8F5B1F" />
          </>
        )}
      </G>
    </Svg>
  );
}
