import { motion, AnimatePresence } from "framer-motion";
import { Check, HardDrive, Zap } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  size: string;
  speed: string;
  quality?: string;
  logo?: string;
  recommended?: boolean;
}

interface ModelSelectionGroupProps {
  models: ModelOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelectionGroup({ models, selectedId, onSelect, disabled }: ModelSelectionGroupProps) {
  const activeColor = "var(--accent)"; // Blue, but we will use it sparingly
  const activeBg = "rgba(255, 255, 255, 0.03)"; // Subtle gray/white bg instead of blue bg
  const inactiveBg = "rgba(10, 10, 10, 0.4)";

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {models.map((model) => {
        const isSelected = selectedId === model.id;

        return (
          <div
            key={model.id}
            onClick={() => !disabled && onSelect(model.id)}
            className={`relative ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
          >
            <div
              className="relative rounded-xl transition-all duration-300 backdrop-blur-sm"
              style={{
                backgroundColor: isSelected ? activeBg : inactiveBg,
                borderColor: isSelected ? "var(--border-hover)" : "var(--border)",
                borderWidth: 1,
                borderStyle: "solid",
                boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
              }}
            >
              <div className="p-3 sm:p-3.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 shrink-0">
                      <div
                        className="w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300"
                        style={{ borderColor: isSelected ? activeColor : "var(--text-muted)", backgroundColor: "rgba(0,0,0,0.4)" }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: activeColor }}
                              transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.2 }}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-white leading-tight flex items-center gap-2">
                        {model.logo && <img src={model.logo} alt="" className="w-4 h-4 object-contain rounded-sm bg-white/10 p-[1px]" />}
                        {model.name}
                        {model.recommended && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded-[4px] ml-1 border border-[var(--accent)]/30">
                            Most Recommended
                          </span>
                        )}
                      </h3>
                      {model.quality && (
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">
                          {model.quality}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-700/50">
                      <HardDrive size={12} className="text-gray-400" />
                      {model.size}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mr-1">
                      <Zap size={10} style={{ color: isSelected ? activeColor : "var(--text-muted)" }} />
                      {model.speed}
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden w-full"
                    >
                      <div className="pt-3 mt-3 border-t border-gray-700/30 flex flex-col gap-2">
                        <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-2.5 text-[12px] text-gray-400">
                          <Check size={14} style={{ color: activeColor }} />
                          Local offline processing
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2.5 text-[12px] text-gray-400">
                          <Check size={14} style={{ color: activeColor }} />
                          Optimized for fast inference
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
