import { Button, Card, Input } from "@madro/ui";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "../auth/useSession";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { supabase } from "../lib/supabase";

type Status = "idle" | "busy" | "sent" | "error" | "rate-limited";

function errorStatus(error: { code?: string; status?: number } | null): Status {
  if (!error) return "sent";
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "rate-limited";
  }
  return "error";
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  if (session) return <Navigate to="/" replace />;

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setStatus(errorStatus(error));
  };

  const signInWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(errorStatus(error) === "rate-limited" ? "rate-limited" : "error");
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-bg font-sans">
      {/* Blød brand-glød øverst — samme dis som på "I dag" */}
      <div
        aria-hidden="true"
        className="page-hero-wash pointer-events-none absolute inset-x-0 top-0 h-96"
      />

      <header className="relative z-10 flex justify-end px-6 pt-6">
        <LanguageSwitch />
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-24">
        {/* Brand-mærke */}
        <div className="mb-8 flex flex-col items-center text-center">
          {/* Brandmærket som lille instrumentplade — signaturen møder én ved døren */}
          <div className="panel-surface mb-5 grid size-16 place-items-center rounded-lg shadow-panel">
            <span className="glow-reading font-mono text-h1 font-semibold text-lume">M</span>
          </div>
          <h1 className="text-display text-ink">{t("auth.title")}</h1>
          <p className="mt-1 text-body text-secondary">{t("auth.subtitle")}</p>
        </div>

        <Card>
          <form
            onSubmit={showPassword ? signInWithPassword : sendMagicLink}
            className="flex flex-col gap-4"
          >
            <Input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              label={t("auth.emailLabel")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {showPassword ? (
              <Input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                label={t("auth.passwordLabel")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            ) : null}

            {status === "sent" ? (
              <p
                className="rounded-md bg-brand-tint px-4 py-3 text-small text-brand"
                role="status"
              >
                {t("auth.magicLinkSent")}
              </p>
            ) : null}
            {status === "rate-limited" ? (
              <p
                className="rounded-md bg-brand-tint px-4 py-3 text-small text-secondary"
                role="status"
              >
                {t("auth.rateLimited")}
              </p>
            ) : null}
            {status === "error" ? (
              <p
                className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad"
                role="alert"
              >
                {t("auth.error")}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={status === "busy"}>
              {showPassword ? t("auth.signIn") : t("auth.sendMagicLink")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPassword((v) => !v);
                setStatus("idle");
              }}
            >
              {showPassword ? t("auth.sendMagicLink") : t("auth.usePassword")}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-caption text-tertiary">
          {t("auth.tagline")}
        </p>
      </div>
    </main>
  );
}
