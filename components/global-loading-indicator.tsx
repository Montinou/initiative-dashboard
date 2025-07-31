"use client"

import { useLoading } from "@/lib/loading-context"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

export function GlobalLoadingIndicator() {
  const { loadingStates, isAnyLoading } = useLoading()
  
  // Get the most recent loading state with a message
  const activeStates = Object.entries(loadingStates)
    .filter(([_, state]) => state.isLoading || state.error)
    .slice(-3) // Show max 3 loading states
  
  return (
    <AnimatePresence>
      {activeStates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-sm space-y-2"
        >
          {activeStates.map(([key, state]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "glassmorphic-card p-4 flex items-center gap-3",
                state.error && "border-red-500/20 bg-red-500/10"
              )}
            >
              {state.error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-400 truncate">{state.error}</p>
                  </div>
                </>
              ) : state.isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 text-white/70 animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">
                      {state.message || "Loading..."}
                    </p>
                    {state.progress !== undefined && (
                      <Progress value={state.progress} className="mt-2 h-1" />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-400 truncate">Success</p>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Simplified loading bar for top of page
export function GlobalLoadingBar() {
  const { isAnyLoading, loadingStates } = useLoading()
  
  // Calculate overall progress if available
  const loadingEntries = Object.values(loadingStates).filter(s => s.isLoading)
  const totalProgress = loadingEntries.reduce((sum, state) => {
    return sum + (state.progress ?? 0)
  }, 0)
  const averageProgress = loadingEntries.length > 0 
    ? totalProgress / loadingEntries.length 
    : 0
  
  return (
    <AnimatePresence>
      {isAnyLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 h-1"
        >
          <div className="relative h-full overflow-hidden bg-white/5">
            {averageProgress > 0 ? (
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                initial={{ width: "0%" }}
                animate={{ width: `${averageProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                animate={{
                  x: ["0%", "100%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  width: "30%",
                  transform: "translateX(-100%)",
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}