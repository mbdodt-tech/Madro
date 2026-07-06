import { Button, Card, Input, cn } from "@madro/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HeartHandshake, Leaf, Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { persistProfileFields, useProfile } from "../auth/useProfile";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PillGroup } from "../components/PillGroup";
import { supabase } from "../lib/supabase";

/**
 * Minimumsalder for at bruge Madro. 13 = den danske GDPR-samtykkealder
 * (databeskyttelseslovens §6, stk. 3). Justér her, hvis linjen skal
 * lægges anderledes før lancering.
 */
const MIN_AGE = 13;

type Step = "welcome" | "age" | "consent" | "basics";
const STEPS: Step[] = ["welcome", "age", "consent", "basics"];

/**
 * Onboarding (fase 4.1): velkomst → aldersgate → eksplicit samtykke →
 * valgfri grundprofil. Vises indtil profiles.onboarded_at er sat —
 * også som ét roligt catch-up-flow for brugere fra før 4.1.
 */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { data: profile, isLoading } = useProfile();

  const [step, setStep] = useState<Step>("welcome");
  const [birthYearText, setBirthYearText] = useState("");
  const [tooYoung, setTooYoung] = useState(false);
  const [sex, setSex] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [calorieChoice, setCalorieChoice] = useState<string>("show");
  const [saving, setSaving] = useState(false);

  if (!isLoading && profile?.onboarded_at) return <Navigate to="/" replace />;

  const currentYear = new Date().getFullYear();

  const submitAge = () => {
    const year = Number(birthYearText);
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) return;
    if (currentYear - year < MIN_AGE) {
      setTooYoung(true);
      return;
    }
    setStep("consent");
  };

  const giveConsent = async () => {
    setSaving(true);
    // Samtykke + fødselsår dokumenteres straks (GDPR-påviselighed).
    await persistProfileFields({
      consent_at: new Date().toISOString(),
      birth_year: Number(birthYearText),
    });
    setSaving(false);
    setStep("basics");
  };

  const finish = async (skipBasics: boolean) => {
    setSaving(true);
    await persistProfileFields({
      ...(skipBasics
        ? {}
        : {
            ...(sex ? { sex } : {}),
            ...(activity ? { activity_level: activity } : {}),
            hide_calories: calorieChoice === "hide",
          }),
      onboarded_at: new Date().toISOString(),
    });
    navigate("/", { replace: true });
  };

  const stepIndex = STEPS.indexOf(step);
  const slide = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 32 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -32 },
        transition: { type: "spring" as const, stiffness: 300, damping: 30 },
      };

  // Venlig stopskærm ved for ung alder — ingen skæld ud, en åben dør senere.
  if (tooYoung) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-center font-sans">
        <div className="panel-surface grid size-16 place-items-center rounded-lg shadow-panel">
          <HeartHandshake className="size-7 text-lume" aria-hidden="true" />
        </div>
        <h1 className="text-h1 text-ink">{t("onboarding.tooYoungTitle")}</h1>
        <p className="max-w-sm text-body text-secondary">{t("onboarding.tooYoungBody")}</p>
        <a
          href="https://www.lmsos.dk"
          target="_blank"
          rel="noreferrer"
          className="text-small font-medium text-brand hover:text-brand-hover"
        >
          {t("profile.supportLink")}
        </a>
        <Button variant="secondary" onClick={() => void supabase.auth.signOut()}>
          {t("common.logout")}
        </Button>
      </main>
    );
  }

  return (
    <main className="page-hero-wash flex min-h-dvh flex-col bg-bg font-sans">
      <header className="flex items-center justify-between px-6 pt-6">
        {/* Fremdriftsprikker — graveret stil */}
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                "size-1.5 rounded-pill transition-colors",
                i <= stepIndex ? "bg-brand" : "bg-hairline",
              )}
            />
          ))}
        </div>
        <LanguageSwitch />
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-16">
        <AnimatePresence mode="wait" initial={false}>
          {step === "welcome" ? (
            <motion.div key="welcome" {...slide} className="space-y-6 text-center">
              <div className="panel-surface mx-auto grid size-16 place-items-center rounded-lg shadow-panel">
                <span className="glow-reading font-mono text-h1 font-semibold text-lume">M</span>
              </div>
              <div>
                <h1 className="text-display text-ink">{t("onboarding.welcomeTitle")}</h1>
                <p className="mt-2 text-body text-secondary">{t("onboarding.welcomeBody")}</p>
              </div>
              <Button className="w-full" onClick={() => setStep("age")}>
                {t("onboarding.start")}
              </Button>
            </motion.div>
          ) : step === "age" ? (
            <motion.div key="age" {...slide} className="space-y-5">
              <div>
                <h1 className="text-h1 text-ink">{t("onboarding.ageTitle")}</h1>
                <p className="mt-1 text-small text-secondary">{t("onboarding.ageBody")}</p>
              </div>
              <Card>
                <Input
                  id="onboarding-birth-year"
                  label={t("profile.birthYear")}
                  inputMode="numeric"
                  placeholder="1990"
                  value={birthYearText}
                  onChange={(e) => setBirthYearText(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAge();
                  }}
                />
              </Card>
              <Button
                className="w-full"
                onClick={submitAge}
                disabled={birthYearText.length !== 4}
              >
                {t("onboarding.next")}
              </Button>
            </motion.div>
          ) : step === "consent" ? (
            <motion.div key="consent" {...slide} className="space-y-5">
              <div>
                <h1 className="text-h1 text-ink">{t("onboarding.consentTitle")}</h1>
              </div>
              <Card>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                    <p className="text-small text-secondary">{t("onboarding.consentData")}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Leaf className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                    <p className="text-small text-secondary">{t("onboarding.consentRights")}</p>
                  </div>
                </div>
              </Card>
              <Button className="w-full" onClick={() => void giveConsent()} disabled={saving}>
                {t("onboarding.consentGive")}
              </Button>
              <p className="text-center text-caption text-tertiary">
                {t("onboarding.consentNote")}
              </p>
            </motion.div>
          ) : (
            <motion.div key="basics" {...slide} className="space-y-5">
              <div>
                <h1 className="text-h1 text-ink">{t("onboarding.basicsTitle")}</h1>
                <p className="mt-1 text-small text-secondary">{t("onboarding.basicsBody")}</p>
              </div>
              <Card>
                <div className="space-y-4">
                  <PillGroup
                    label={t("profile.sex")}
                    value={sex}
                    onChange={setSex}
                    options={[
                      { id: "female", label: t("profile.sexFemale") },
                      { id: "male", label: t("profile.sexMale") },
                      { id: "unspecified", label: t("profile.sexUnspecified") },
                    ]}
                  />
                  <PillGroup
                    label={t("profile.activity")}
                    value={activity}
                    onChange={setActivity}
                    options={[
                      { id: "sedentary", label: t("profile.activitySedentary") },
                      { id: "moderate", label: t("profile.activityModerate") },
                      { id: "active", label: t("profile.activityActive") },
                    ]}
                  />
                  <PillGroup
                    label={t("onboarding.calorieLabel")}
                    value={calorieChoice}
                    onChange={setCalorieChoice}
                    options={[
                      { id: "show", label: t("onboarding.calorieShow") },
                      { id: "hide", label: t("onboarding.calorieHide") },
                    ]}
                  />
                  <p className="text-caption text-tertiary">{t("onboarding.calorieNote")}</p>
                </div>
              </Card>
              <Button className="w-full" onClick={() => void finish(false)} disabled={saving}>
                {t("onboarding.finish")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => void finish(true)}
                disabled={saving}
              >
                {t("onboarding.skip")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="pb-6 text-center text-caption text-tertiary">{t("auth.tagline")}</p>
    </main>
  );
}
