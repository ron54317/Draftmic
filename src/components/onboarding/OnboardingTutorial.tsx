import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, Code, MessageSquare, Mic } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { DictateWidget } from "../widget/DictateWidget";
import { MockEmailComposer } from "../ui/MockEmailComposer";
import { MockIDE } from "../ui/MockIDE";
import { MockChat } from "../ui/MockChat";
import { ShinyButton } from "../ui/shiny-button";

type Scenario = "email" | "code" | "chat" | null;

export function OnboardingTutorial() {
  const { setOnboardingStep, completeOnboarding, dictateHotkey } = useAppStore();
  const [scenario, setScenario] = useState<Scenario>(null);
  const [hasDictated, setHasDictated] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 48px",
        gap: 20,
        position: "relative",
        minHeight: "100%",
      }}
    >
      <div style={{
        position: "absolute",
        top: "10%",
        right: "20%",
        width: 400,
        height: 400,
        background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        filter: "blur(120px)",
        opacity: 0.15,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Content wrapper */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", margin: "auto 0" }}>
      <AnimatePresence mode="wait">
        {!scenario ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, zIndex: 1, width: "100%", maxWidth: 600 }}
          >
            <div style={{ textAlign: "center", maxWidth: 400 }}>
              <h2 style={{ 
                fontSize: 24, 
                fontWeight: 800, 
                color: "var(--text-primary)", 
                letterSpacing: "-0.02em", 
                marginBottom: 8,
                background: "linear-gradient(to right, var(--text-primary), var(--text-secondary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Let's practice!
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                What will you use Draftmic for mostly?
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full">
              <button
                onClick={() => setScenario("email")}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 transition-all cursor-pointer group shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail size={24} className="text-blue-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-sm text-zinc-200">Emails</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Professional comms</p>
                </div>
              </button>

              <button
                onClick={() => setScenario("code")}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800 transition-all cursor-pointer group shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Code size={24} className="text-orange-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-sm text-zinc-200">Coding</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">IDE & Terminal</p>
                </div>
              </button>

              <button
                onClick={() => setScenario("chat")}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all cursor-pointer group shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare size={24} className="text-emerald-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-sm text-zinc-200">Chatting</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Slack, Teams, etc.</p>
                </div>
              </button>
            </div>

            <button
              className="btn btn-ghost mt-4"
              onClick={() => completeOnboarding()}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}
            >
              Skip Tutorial <ArrowRight size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="practice"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex flex-col items-center w-full max-w-4xl gap-6 z-10"
          >
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Try it out!</h2>
              <p className="text-sm text-zinc-400 flex items-center justify-center gap-2">
                Press <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white font-mono">
                  {navigator.userAgent.includes("Mac") 
                    ? dictateHotkey.replace(/CommandOrControl/g, "⌘").replace(/Shift/g, "⇧").replace(/Alt/g, "⌥").replace(/\+/g, " ")
                    : dictateHotkey.replace(/CommandOrControl/g, "Ctrl")}
                </kbd> to talk, or click the mic on the widget below.
              </p>
            </div>

            <div className="w-full relative shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)] rounded-xl">
              {/* Render the selected mock UI */}
              <div className="w-full relative z-0">
                {scenario === "email" && <MockEmailComposer />}
                {scenario === "code" && <MockIDE />}
                {scenario === "chat" && <MockChat />}
              </div>

              {/* The inline DictateWidget */}
              <div className="absolute inset-x-0 bottom-2 flex justify-center z-50 pointer-events-none">
                <div className="pointer-events-auto transform scale-[0.85] origin-bottom">
                  <DictateWidget inline={true} onDictate={() => setHasDictated(true)} />
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-md mt-4 justify-center">
              <ShinyButton
                disabled={!hasDictated}
                onClick={() => {
                  completeOnboarding();
                }}
              >
                Finish Setup
              </ShinyButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
