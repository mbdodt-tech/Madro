import { AppShell, BottomTabBar, ScanFab, spring, useToast } from "@madro/ui";
import { BarChart3, BookOpen, House, ScanBarcode, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ROUTES: Record<string, string> = {
  today: "/",
  diary: "/diary",
  insights: "/insights",
  profile: "/profile",
};

/**
 * Fælles skal for fane-siderne: tab-bar med rute-afledt aktiv fane og
 * scan-FAB. Alle fire faner har en side (profil kom til i 3.1).
 */
export function TabShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { show } = useToast();
  const reduceMotion = useReducedMotion();

  const activeId =
    Object.entries(TAB_ROUTES).find(([, route]) => route === pathname)?.[0] ??
    "today";

  const iconCls = "size-5";

  return (
    // h-dvh: skallen fylder præcis viewporten, så indholdet scroller
    // indeni og tab-baren (absolute bottom-0 + blur) altid er synlig.
    <div className="h-dvh">
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
        {/* Fane-entrance (4.4): diskret fade+løft ved sideskift — hver side
            monterer sin egen TabShell, så ruteskift afspiller den én gang.
            Reduced motion → intet. */}
        <motion.div
          className="min-h-full"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          {children}
        </motion.div>
      </AppShell>
    </div>
  );
}
