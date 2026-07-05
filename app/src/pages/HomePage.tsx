import { Button, Card, Chip, Skeleton } from "@madro/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useProfile } from "../auth/useProfile";
import { useSession } from "../auth/useSession";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { TabShell } from "../components/TabShell";
import { supabase } from "../lib/supabase";

export function HomePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { data: profile, isLoading } = useProfile();

  return (
    <TabShell>
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-10 font-sans">
        <div className="flex items-center justify-between">
          <h1 className="text-display text-ink">{t("home.greeting")}</h1>
          <LanguageSwitch />
        </div>

        <Card>
          {isLoading || !profile ? (
            <div className="space-y-2" aria-label={t("home.loadingProfile")}>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-body text-ink">
                {t("home.signedInAs", { email: session?.user.email })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip>{t("home.localeFact", { locale: profile.locale })}</Chip>
                <Chip>
                  {profile.hide_calories
                    ? t("home.hideCaloriesOn")
                    : t("home.hideCaloriesOff")}
                </Chip>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-small text-secondary">{t("home.scanTeaser")}</p>
        </Card>

        <div className="flex items-center justify-between">
          <Link
            className="text-small font-medium text-brand hover:text-brand-hover"
            to="/design"
          >
            {t("home.designLink")}
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void supabase.auth.signOut()}
          >
            {t("common.logout")}
          </Button>
        </div>
      </main>
    </TabShell>
  );
}
