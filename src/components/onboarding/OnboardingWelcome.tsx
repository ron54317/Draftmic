import { motion } from "framer-motion";
import { ArrowRight, Mic, Globe, Lock, Zap, Check } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { GlowCard } from "../ui/spotlight-card";
import { useState, useEffect, useRef } from "react";

export function OnboardingWelcome() {
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const [agreed, setAgreed] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (bgRef.current) {
        // Move the light source slightly based on mouse position (e.g. 30% to 70%)
        const xPos = 30 + (e.clientX / window.innerWidth) * 40;
        bgRef.current.style.setProperty('--light-x', `${xPos}%`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    { icon: <Mic size={24} strokeWidth={2} />, label: "Transcribes locally", desc: "Whisper AI runs entirely on your CPU" },
    { icon: <Globe size={24} strokeWidth={2} />, label: "99 languages", desc: "English, Spanish, Chinese, and more" },
    { icon: <Lock size={24} strokeWidth={2} />, label: "Zero data sent", desc: "Your voice never leaves your computer" },
    { icon: <Zap size={24} strokeWidth={2} />, label: "Works everywhere", desc: "Paste into any app with a hotkey" },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 64px",
        position: "relative",
        minHeight: "100%",
      }}
    >
      {/* Background glow effects (Sun flare) */}
      <div 
        ref={bgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse 120% 70% at var(--light-x, 50%) -15%, rgba(0, 98, 255, 0.3) 0%, rgba(0, 98, 255, 0.05) 40%, transparent 80%)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 0.1s ease-out"
        }} 
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 640, margin: "auto 0" }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            marginBottom: 24,
            filter: "drop-shadow(0 8px 32px rgba(0, 98, 255, 0.4))",
          }}
        >
          <img 
            src="/LogoNobackround.png" 
            alt="Draftmic Logo" 
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 12,
              background: "linear-gradient(135deg, var(--text-primary) 30%, var(--text-secondary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome to Draftmic
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              maxWidth: 360,
              margin: "0 auto",
            }}
          >
            Lightning fast voice dictation that runs entirely on your device. Just speak and your words appear.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            width: "100%",
            marginBottom: 40,
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <GlowCard 
                glowColor="blue"
                customSize={true}
                className="w-full h-full flex flex-col items-start !p-6 !gap-4 !shadow-none cursor-default"
                width="100%"
                height="100%"
              >
                <div style={{ color: "var(--accent)", marginBottom: 4 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Legal Agreement */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          onClick={() => setAgreed(!agreed)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            width: "100%",
            maxWidth: 420,
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 16,
            border: agreed ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.05)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          whileHover={{ background: "rgba(255, 255, 255, 0.04)" }}
          whileTap={{ background: "rgba(255, 255, 255, 0.06)" }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: agreed ? "none" : "2px solid rgba(255, 255, 255, 0.2)",
              background: agreed ? "var(--accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            <motion.div
              initial={false}
              animate={{ opacity: agreed ? 1 : 0, scale: agreed ? 1 : 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <Check size={16} strokeWidth={3} color="white" />
            </motion.div>
          </div>
          <div style={{ fontSize: 13, color: agreed ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.5, userSelect: "none" }}>
            I have read and agree to the open-source{" "}
            <a href="https://draftmic.com/terms" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Terms of Service</a>{" "}
            and{" "}
            <a href="https://draftmic.com/privacy" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</a>.
          </div>
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={agreed ? { scale: 1.03 } : {}}
          whileTap={agreed ? { scale: 0.97 } : {}}
          transition={{ delay: 0.5, duration: 0.3 }}
          className={`btn btn-lg ${agreed ? 'btn-primary' : ''}`}
          onClick={() => {
            if (agreed) setOnboardingStep("permissions");
          }}
          disabled={!agreed}
          style={{ 
            width: "100%", 
            maxWidth: 240, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: 8,
            boxShadow: agreed ? "0 8px 20px rgba(0, 98, 255, 0.25)" : "none",
            opacity: agreed ? 1 : 0.5,
            cursor: agreed ? "pointer" : "not-allowed",
            background: agreed ? undefined : "rgba(255, 255, 255, 0.1)",
            color: agreed ? undefined : "rgba(255, 255, 255, 0.5)"
          }}
        >
          Get Started
          <ArrowRight size={16} />
        </motion.button>
      </div>
    </div>
  );
}
