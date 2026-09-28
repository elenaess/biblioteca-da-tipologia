import { useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { ArrowUpRight, Coffee, Heart, LoaderCircle } from "lucide-react";
import SupportPaymentForm from "../components/SupportPaymentForm";
import { useLocale } from "../i18n/LocaleContext";
import {
  SUPPORT_AMOUNTS,
  createSupportIntent,
  formatSupportAmount,
  isSupportAmount,
  stripePublishableKey,
  type SupportAmount,
} from "../support";

const KOFI_URL = "https://ko-fi.com/bibliotecadatipologia";
const stripeKey = stripePublishableKey();
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function initialReturnState() {
  const params = new URLSearchParams(window.location.search);
  const amountCandidate = Number(params.get("support_amount"));
  return {
    amount: isSupportAmount(amountCandidate) ? amountCandidate : 500,
    clientSecret: params.get("payment_intent_client_secret") || "",
  } as { amount: SupportAmount; clientSecret: string };
}

export default function Support() {
  const { locale, t } = useLocale();
  const returned = useMemo(initialReturnState, []);
  const [amount, setAmount] = useState<SupportAmount>(returned.amount);
  const [clientSecret, setClientSecret] = useState(returned.clientSecret);
  const [returning, setReturning] = useState(Boolean(returned.clientSecret));
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [error, setError] = useState("");

  async function preparePayment() {
    if (creatingIntent || clientSecret) return;
    setCreatingIntent(true);
    setError("");
    try {
      setClientSecret(await createSupportIntent(amount));
      setReturning(false);
    } catch {
      setError(t("support.errorGeneric"));
    } finally {
      setCreatingIntent(false);
    }
  }

  function chooseAmount(next: SupportAmount) {
    if (creatingIntent) return;
    setAmount(next);
    setClientSecret("");
    setReturning(false);
    setError("");
  }

  function changeAmount() {
    setClientSecret("");
    setReturning(false);
    setError("");
  }

  const appearance: StripeElementsOptions["appearance"] = {
    theme: "stripe",
    variables: {
      colorPrimary: "#8f4632",
      colorBackground: "#fffaf2",
      colorText: "#352c25",
      colorDanger: "#9b3f35",
      colorTextSecondary: "#766b60",
      fontFamily: '"DM Sans", Arial, sans-serif',
      borderRadius: "6px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: "1px solid #d9ccba",
        boxShadow: "none",
        backgroundColor: "#fffaf2",
      },
      ".Input:focus": {
        border: "1px solid #8f4632",
        boxShadow: "0 0 0 1px #8f4632",
      },
      ".Tab": {
        border: "1px solid #ded4c5",
        boxShadow: "none",
      },
      ".Tab--selected": {
        borderColor: "#8f4632",
        boxShadow: "0 0 0 1px #8f4632",
      },
    },
  };

  return (
    <section className="support-page">
      <div className="support-hero">
        <div className="support-icon"><Heart size={25} strokeWidth={1.8} /></div>
        <div>
          <div className="eyebrow">{t("support.eyebrow")}</div>
          <h1>{t("support.title")}</h1>
          <p>{t("support.description")}</p>
        </div>
      </div>

      <div className="support-layout">
        <div className="support-card support-main-card">
          <div className="support-card-heading">
            <div>
              <span className="support-step">01</span>
              <h2>{t("support.chooseAmount")}</h2>
            </div>
            <span className="support-currency">BRL</span>
          </div>

          <div className="support-amount-grid" role="group" aria-label={t("support.chooseAmount")}>
            {SUPPORT_AMOUNTS.map((option) => {
              const selected = option.amount === amount;
              return (
                <button
                  key={option.amount}
                  type="button"
                  className={`support-amount${selected ? " selected" : ""}`}
                  aria-pressed={selected}
                  disabled={creatingIntent || Boolean(clientSecret)}
                  onClick={() => chooseAmount(option.amount)}
                >
                  {formatSupportAmount(option.amount, locale)}
                </button>
              );
            })}
          </div>

          {!stripePromise && (
            <div className="support-continue-area">
              <p className="support-error" role="alert">{t("support.invalidConfig")}</p>
            </div>
          )}

          {!clientSecret && stripePromise && (
            <div className="support-continue-area">
              {error && <p className="support-error" role="alert">{error}</p>}
              <button className="button support-primary-button" type="button" onClick={preparePayment} disabled={creatingIntent}>
                {creatingIntent ? <><LoaderCircle className="support-spin" size={17} />{t("support.preparing")}</> : t("support.continue", { amount: formatSupportAmount(amount, locale) })}
              </button>
            </div>
          )}

          {clientSecret && stripePromise && (
            <div className="support-payment-section">
              <div className="support-card-heading support-payment-title">
                <div>
                  <span className="support-step">02</span>
                  <h2>{t("support.paymentTitle")}</h2>
                </div>
                <strong>{formatSupportAmount(amount, locale)}</strong>
              </div>
              <Elements
                key={`${clientSecret}-${locale}`}
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance,
                  locale: locale === "pt" ? "pt-BR" : locale === "es" ? "es" : "en",
                  loader: "auto",
                }}
              >
                <SupportPaymentForm amount={amount} clientSecret={clientSecret} returning={returning} onChangeAmount={changeAmount} />
              </Elements>
            </div>
          )}
        </div>

        <aside className="support-card support-kofi-card">
          <Coffee size={24} />
          <div>
            <span className="support-step">{t("support.alternative")}</span>
            <h2>{t("support.kofiTitle")}</h2>
            <p>{t("support.kofiDescription")}</p>
          </div>
          <a className="button support-secondary-button" href={KOFI_URL} target="_blank" rel="noreferrer">
            {t("support.kofiAction")} <ArrowUpRight size={16} />
          </a>
        </aside>
      </div>
    </section>
  );
}
