import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingPermissions } from "./OnboardingPermissions";
import { OnboardingModel } from "./OnboardingModel";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { OnboardingProgress } from "./OnboardingProgress";

export function Onboarding() {
  const onboardingStep = useAppStore((s) => s.onboardingStep);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <OnboardingProgress currentStep={onboardingStep as any} />
      <AnimatePresence mode="wait">
        <motion.div
          key={onboardingStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          {onboardingStep === "welcome" && <OnboardingWelcome />}
          {onboardingStep === "permissions" && <OnboardingPermissions />}
          {onboardingStep === "model" && <OnboardingModel />}
          {onboardingStep === "tutorial" && <OnboardingTutorial />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
