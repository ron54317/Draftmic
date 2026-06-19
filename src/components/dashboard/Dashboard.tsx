import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { Sidebar } from "./Sidebar";
import { DashboardView } from "./DashboardView";
import { HistoryView } from "./HistoryView";
import { SettingsView } from "./SettingsView";
import { TranslationView } from "./TranslationView";

export function Dashboard() {
  const navSection = useAppStore((s) => s.navSection);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <AnimatePresence mode="wait">
          {navSection === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <DashboardView />
            </motion.div>
          )}

          {navSection === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <HistoryView />
            </motion.div>
          )}

          {navSection === "translation" && (
            <motion.div
              key="translation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: "flex", overflow: "hidden" }}
            >
              <TranslationView />
            </motion.div>
          )}

          {navSection === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: "flex", overflow: "hidden" }}
            >
              <SettingsView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
