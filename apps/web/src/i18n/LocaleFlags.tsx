import { useLocale } from "./LocaleContext";

type FlagLocale = "pt" | "en" | "es";

function FlagCircle({ locale }: { locale: FlagLocale }) {
  if (locale === "pt") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="clip-pt-flag"><circle cx="32" cy="32" r="32" /></clipPath>
        </defs>
        <g clipPath="url(#clip-pt-flag)">
          <rect width="64" height="64" fill="#039b3a" />
          <polygon points="32,10 54,32 32,54 10,32" fill="#ffdf00" />
          <circle cx="32" cy="32" r="12" fill="#1f2b88" />
          <path d="M22 29.5c7.5-2.8 14.5-2.8 20 0" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  if (locale === "en") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="clip-en-flag"><circle cx="32" cy="32" r="32" /></clipPath>
        </defs>
        <g clipPath="url(#clip-en-flag)">
          <rect width="64" height="64" fill="#ffffff" />
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x="0" y={i * 10} width="64" height="5" fill="#c83b32" />
          ))}
          <rect x="0" y="0" width="30" height="28" fill="#22408c" />
          {Array.from({ length: 3 }).flatMap((_, row) =>
            Array.from({ length: 4 }).map((__, col) => (
              <circle key={`${row}-${col}`} cx={5 + col * 6.5 + (row % 2 ? 3 : 0)} cy={6 + row * 7} r="1.2" fill="#ffffff" />
            )),
          )}
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="clip-es-flag"><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath="url(#clip-es-flag)">
        <rect x="0" y="0" width="21.34" height="64" fill="#1f8b4c" />
        <rect x="21.33" y="0" width="21.34" height="64" fill="#ffffff" />
        <rect x="42.66" y="0" width="21.34" height="64" fill="#d5423a" />
        <circle cx="32" cy="32" r="4.2" fill="#b7852d" />
        <circle cx="32" cy="32" r="2.1" fill="#8f5b1f" />
      </g>
    </svg>
  );
}

export default function LocaleFlags() {
  const { locale, setLocale, options, t } = useLocale();
  return (
    <section className="locale-picker" aria-label={t("account.language")}>
      <div className="locale-picker-copy">
        <strong>{t("account.language")}</strong>
        <small>{t("account.languageHint")}</small>
      </div>
      <div className="locale-options">
        {options.map((option) => (
          <button
            key={option.locale}
            type="button"
            className={locale === option.locale ? "locale-option active" : "locale-option"}
            aria-pressed={locale === option.locale}
            aria-label={option.label}
            onClick={() => setLocale(option.locale)}
          >
            <span className="locale-flag" aria-hidden="true">
              <FlagCircle locale={option.locale as FlagLocale} />
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
