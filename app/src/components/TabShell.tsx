import { AppShell, BottomTabBar, ScanFab, useToast } from "@madro/ui";
import { BarChart3, BookOpen, House, ScanBarcode, User } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ROUTES: Record<string, string> = {
  today: "/",
  diary: "/diary",
};

/**
 * Fælles skal for fane-siderne: tab-bar med rute-afledt aktiv fane og
 * scan-FAB. Faner uden side endnu (indsigt, profil) viser "kommer snart".
 */
export function TabShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { show } = useToast();

  const activeId =
    Object.entries(TAB_ROUTES).find(([, route]) => route === pathname)?.[0] ??
    "today";

  const iconCls = "size-5";

  return (
    <AppShell
      bottomBar={
        <BottomTabBar
          navLabel={t("shell.navLabel")}
          activeId={activeId}
          onSelect={(id) => {
            const route = TAB_ROUTES[id];
            if (route) navigate(route);
            else show(t("shell.comingSoon"));
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
      {children}
    </AppShell>
  );
}
