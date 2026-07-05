import {
  AppShell,
  BottomTabBar,
  Button,
  Card,
  Chip,
  ScanFab,
  Skeleton,
  useToast,
} from "@madro/ui";
import { BarChart3, BookOpen, House, ScanBarcode, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "../auth/useProfile";
import { useSession } from "../auth/useSession";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { supabase } from "../lib/supabase";

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { data: session } = useSession();
  const { data: profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState("today");

  const iconCls = "size-5";
  const comingSoon = () => show(t("shell.comingSoon"));

  return (
    <AppShell
      bottomBar={
        <BottomTabBar
          navLabel={t("shell.navLabel")}
          activeId={activeTab}
          onSelect={(id) => {
            if (id === "today") setActiveTab(id);
            else comingSoon();
          }}
          items={[
            { id: "today", label: t("shell.today"), icon: <House className={iconCls} /> },
            { id: "diary", label: t("shell.diary"), icon: <BookOpen className={iconCls} /> },
            { id: "insights", label: t("shell.insights"), icon: <BarChart3 className={iconCls} /> },
            { id: "profile", label: t("shell.profile"), icon: <User className={iconCls} /> },
          ]}
          center={
            <ScanFab
              label={t("shell.scan")}
              icon={<ScanBarcode className="size-6" />}
              onClick={() => navigate("/scan")}
            />
          }
        />
      }
    >
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
    </AppShell>
  );
}
