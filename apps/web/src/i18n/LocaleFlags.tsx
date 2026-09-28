import { useLocale } from "./LocaleContext";
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
          <button key={option.locale} type="button" className={locale === option.locale ? "locale-option active" : "locale-option"}
            aria-pressed={locale === option.locale} aria-label={option.label} onClick={() => setLocale(option.locale)}>
            <span className="locale-flag" aria-hidden="true">{option.flag}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
