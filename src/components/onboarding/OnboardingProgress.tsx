import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type OnboardingStep = "welcome" | "permissions" | "model" | "tutorial";
const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "permissions", label: "Permissions" },
  { id: "model", label: "Model" },
  { id: "tutorial", label: "Tutorial" },
];

interface Props {
  currentStep: OnboardingStep;
}

export function OnboardingProgress({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="absolute top-0 inset-x-0 flex items-center justify-center z-50 pt-6 pointer-events-none">
      <div className="pointer-events-auto bg-zinc-950/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2.5 flex items-center gap-3 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] relative overflow-hidden">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />

        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          
          return (
            <React.Fragment key={step.id}>
              {/* Connecting Line */}
              {i > 0 && (
                <div className="w-6 h-[2px] bg-zinc-800 overflow-hidden rounded-full shrink-0">
                  {/* Animated fill for the line */}
                  <motion.div 
                    initial={false}
                    animate={{ width: isCompleted || isActive ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2.5 relative">
                {/* Step Circle */}
                <div
                  className={`relative flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all duration-500 z-10 shrink-0
                    ${isActive ? "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110" : 
                      isCompleted ? "bg-zinc-800 text-white border border-zinc-700" : "bg-zinc-900/50 text-zinc-600 border border-zinc-800/50"}`}
                >
                  {isCompleted ? <Check size={14} className="text-white" /> : <span>{i + 1}</span>}
                </div>

                {/* Step Label */}
                <span className={`text-[13px] font-semibold tracking-wide transition-colors duration-300 ${isActive ? "text-white" : isCompleted ? "text-zinc-300" : "text-zinc-600"}`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
