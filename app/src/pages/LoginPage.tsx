import { Button, Card, Input } from "@madro/ui";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "../auth/useSession";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { supabase } from "../lib/supabase";

type Status = "idle" | "busy" | "sent" | "error";

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
    setStatus(error ? "error" : "sent");
  };

  const signInWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setStatus("error");
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 font-sans">
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>
      <div>
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
            <p className="rounded-md bg-brand-tint px-4 py-3 text-small text-brand" role="status">
              {t("auth.magicLinkSent")}
            </p>
          ) : null}
          {status === "error" ? (
            <p className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad" role="alert">
              {t("auth.error")}
            </p>
          ) : null}

          <Button type="submit" disabled={status === "busy"}>
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
    </main>
  );
}
