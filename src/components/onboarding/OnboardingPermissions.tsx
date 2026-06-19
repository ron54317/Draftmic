import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Mic, Keyboard, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { HotkeyModal } from "../ui/HotkeyModal";
import { invoke } from "@tauri-apps/api/core";

export function OnboardingPermissions() {
  const { setOnboardingStep, dictateHotkey, micPermission, selectedMicrophone, setMicrophone } = useAppStore() as any;
  const [isHotkeyModalOpen, setIsHotkeyModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [microphones, setMicrophones] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const requestMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      (useAppStore.getState() as any).setMicPermission?.("granted");
    } catch {
      (useAppStore.getState() as any).setMicPermission?.("denied");
    }
  };

  const mp: "pending" | "granted" | "denied" = micPermission ?? "pending";

  useEffect(() => {
    if (mp === "granted") {
      invoke<string[]>("get_audio_devices")
        .then((devices) => setMicrophones(devices))
        .catch((e) => console.error("Failed to load mics", e));
    }
  }, [mp]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 64px",
        gap: 32,
        position: "relative",
        minHeight: "100%",
      }}
    >
      {/* Background gradients from the original design */}
      <div style={{
        position: "absolute",
        top: "20%",
        right: "15%",
        width: 400,
        height: 400,
        background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        filter: "blur(100px)",
        opacity: 0.15,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        left: "15%",
        width: 300,
        height: 300,
        background: "radial-gradient(circle, var(--green) 0%, transparent 70%)",
        filter: "blur(120px)",
        opacity: 0.08,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <HotkeyModal isOpen={isHotkeyModalOpen} onClose={() => setIsHotkeyModalOpen(false)} />

      {/* Content wrapper */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", margin: "auto 0", gap: 32 }}>
        <motion.div 
            className='bg-black/80 backdrop-blur-sm shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col p-6 gap-4 overflow-hidden border border-gray-800 relative z-10'
            style={{ width: "100%", maxWidth: 440, minHeight: 400, borderRadius: "2rem" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          whileHover={{ 
              boxShadow: "0 35px 60px -15px rgba(0,0,0,0.7)",
              borderColor: "rgba(255,255,255,0.2)"
          }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
      >
          <div className='flex flex-col gap-6 flex-1 justify-center mt-2'>
              <motion.div 
                  className="title text-4xl text-center font-bold text-white"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  style={{ lineHeight: 1.1, letterSpacing: "-0.01em" }}
              >
                  SETUP
                  <br />
                  ACCESS
              </motion.div>

              {/* Action Area */}
              <motion.div 
                  className="relative flex flex-col gap-5 p-4 z-10"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
              >
                  {/* Background glow behind options */}
                  <div className="absolute inset-0 rounded-2xl opacity-20 z-0 pointer-events-none overflow-hidden">
                      <motion.div
                          animate={{ opacity: isHovered ? 1 : 0.8 }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          className="w-full h-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 blur-xl"
                      />
                  </div>

                  {/* Mic Row */}
                  <motion.div 
                      className="relative z-10 bg-black/60 border border-gray-700/50 rounded-2xl p-5 flex items-center justify-between backdrop-blur-md cursor-pointer group"
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.8)" }}
                      onClick={mp !== "granted" ? requestMic : undefined}
                      style={{ cursor: mp === "granted" ? "default" : "pointer" }}
                  >
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mp === 'granted' ? 'bg-green-500/20 text-green-400' : mp === 'denied' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-300'}`}>
                          {mp === "granted" ? <CheckCircle2 size={24} /> : mp === "denied" ? <XCircle size={24} /> : <Mic size={24} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-semibold text-[16px]">Microphone</span>
                          <span className={`text-[13px] mt-0.5 ${mp === 'granted' ? 'text-green-400' : mp === 'denied' ? 'text-red-400' : 'text-gray-400'}`}>
                            {mp === "granted" ? "Access granted" : mp === "denied" ? "Click to allow access" : "Required to dictate"}
                          </span>
                        </div>
                      </div>
                      {mp !== "granted" ? (
                        <div className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${mp === 'denied' ? 'bg-gray-800 text-gray-300 group-hover:bg-gray-700' : 'bg-blue-600 text-white group-hover:bg-blue-500'}`}>
                          {mp === "denied" ? "Settings" : "Allow"}
                        </div>
                      ) : (
                        <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 rounded-xl text-[13px] font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2"
                            style={{ outline: "none" }}
                          >
                            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedMicrophone || "Default Mic"}
                            </span>
                            <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }}>
                              <ChevronDown size={14} />
                            </motion.div>
                          </button>

                          <AnimatePresence>
                            {isDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  position: "absolute",
                                  bottom: "calc(100% + 8px)", // opens upwards
                                  right: 0,
                                  background: "rgba(20,20,20,0.95)",
                                  backdropFilter: "blur(10px)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 12,
                                  padding: 6,
                                  minWidth: 200,
                                  maxHeight: 200,
                                  overflowY: "auto",
                                  zIndex: 50,
                                  boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                }}
                              >
                                <div
                                  onClick={() => { setMicrophone(null); setIsDropdownOpen(false); }}
                                  className={`px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors ${!selectedMicrophone ? 'bg-white/10 text-white font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                >
                                  Default Device
                                </div>
                                {microphones.map(mic => (
                                  <div
                                    key={mic}
                                    onClick={() => { setMicrophone(mic); setIsDropdownOpen(false); }}
                                    className={`px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors ${selectedMicrophone === mic ? 'bg-white/10 text-white font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={mic}
                                  >
                                    {mic}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                  </motion.div>

                  {/* Hotkey Row */}
                  <motion.div 
                      className="relative z-10 bg-black/60 border border-gray-700/50 rounded-2xl p-5 flex items-center justify-between backdrop-blur-md cursor-pointer group"
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.8)" }}
                      onClick={() => setIsHotkeyModalOpen(true)}
                  >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-gray-800 text-gray-300 flex items-center justify-center">
                          <Keyboard size={24} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-semibold text-[16px]">Global Hotkey</span>
                          <span className="text-[13px] text-gray-400 mt-0.5">
                            Current: <span className="text-blue-400 font-mono font-medium">{dictateHotkey?.replace(/CommandOrControl/g, "Cmd/Ctrl") || "Not set"}</span>
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl text-[13px] font-bold bg-gray-800 text-gray-300 group-hover:bg-gray-700 transition-colors">
                        Set
                      </div>
                  </motion.div>
              </motion.div>

              <motion.div 
                  className="desc text-[13px] text-center max-w-[320px] mx-auto text-neutral-400 font-light mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.7 }}
                  style={{ lineHeight: 1.6 }}
              >
                  Click the rows above to configure your system access and unleash the power of Draftmic.
              </motion.div>
          </div>
      </motion.div>

      {/* Navigation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ display: "flex", gap: 12, zIndex: 1 }}
      >
        <button
          className="btn btn-secondary"
          onClick={() => setOnboardingStep("welcome")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 10, fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setOnboardingStep("model")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 32px", borderRadius: 10, fontWeight: 600 }}
        >
          Continue <ArrowRight size={16} />
        </button>
      </motion.div>
      </div>
    </div>
  );
}

