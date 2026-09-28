import { useEffect, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useLocale } from "../i18n/LocaleContext";
import { formatSupportAmount, type SupportAmount } from "../support";

type Props = {
  amount: SupportAmount;
  clientSecret: string;
  returning?: boolean;
  onChangeAmount: () => void;
};

type ResultState = "form" | "processing" | "success";

function returnUrl(amount: SupportAmount) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("support_amount", String(amount));
  url.hash = "/apoiar";
  return url.toString();
}

function clearReturnQuery() {
  if (!window.location.search) return;
  window.history.replaceState({}, "", `${window.location.pathname}#/apoiar`);
}

export default function SupportPaymentForm({ amount, clientSecret, returning = false, onChangeAmount }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { locale, t } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultState>(returning ? "processing" : "form");

  useEffect(() => {
    if (!returning || !stripe || !clientSecret) return;
    let active = true;
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent, error }) => {
      if (!active) return;
      clearReturnQuery();
      if (error || !paymentIntent) {
        setMessage(error?.message || t("support.errorGeneric"));
        setResult("form");
        return;
      }
      if (paymentIntent.status === "succeeded") {
        setResult("success");
        return;
      }
      if (paymentIntent.status === "processing") {
        setResult("processing");
        return;
      }
      setMessage(t("support.errorGeneric"));
      setResult("form");
    });
    return () => { active = false; };
  }, [clientSecret, returning, stripe, t]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setMessage("");

    const submitResult = await elements.submit();
    if (submitResult.error) {
      setMessage(submitResult.error.message || t("support.errorGeneric"));
      setSubmitting(false);
      return;
    }

    const confirmation = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl(amount) },
      redirect: "if_required",
    });

    if (confirmation.error) {
      setMessage(confirmation.error.message || t("support.errorGeneric"));
      setSubmitting(false);
      return;
    }

    if (confirmation.paymentIntent?.status === "succeeded") {
      setResult("success");
    } else if (confirmation.paymentIntent?.status === "processing") {
      setResult("processing");
    } else {
      setMessage(t("support.errorGeneric"));
    }
    setSubmitting(false);
  }

  if (result === "success") {
    return (
      <div className="support-result support-result-success" role="status">
        <CheckCircle2 size={30} />
        <div>
          <h2>{t("support.successTitle")}</h2>
          <p>{t("support.successDescription")}</p>
          <a className="button support-primary-button" href="#/">{t("support.backLibrary")}</a>
        </div>
      </div>
    );
  }

  if (result === "processing") {
    return (
      <div className="support-result" role="status">
        <LoaderCircle className="support-spin" size={28} />
        <div>
          <h2>{t("support.processingTitle")}</h2>
          <p>{t("support.processingDescription")}</p>
        </div>
      </div>
    );
  }

  const formattedAmount = formatSupportAmount(amount, locale);
  return (
    <form className="support-payment-form" onSubmit={submit}>
      <div className="support-payment-heading">
        <span className="support-secure-label"><LockKeyhole size={15} />{t("support.secure")}</span>
        <button className="support-change-button" type="button" onClick={onChangeAmount} disabled={submitting}>
          {t("support.changeAmount")}
        </button>
      </div>
      <PaymentElement options={{ layout: "tabs" }} />
      {message && <p className="support-error" role="alert">{message}</p>}
      <button className="button support-primary-button support-pay-button" type="submit" disabled={!stripe || !elements || submitting}>
        {submitting ? <><LoaderCircle className="support-spin" size={17} />{t("support.processing")}</> : t("support.pay", { amount: formattedAmount })}
      </button>
    </form>
  );
}
