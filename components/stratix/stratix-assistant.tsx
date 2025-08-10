'use client'

export function StratixAssistant() {
  if (typeof window !== 'undefined' && !(window as any).__STRATIX_ASSISTANT_WARNED__) {
    ;(window as any).__STRATIX_ASSISTANT_WARNED__ = true
    console.warn('[deprecated] components/stratix/stratix-assistant.tsx was removed. Use <DialogflowChatWidget /> or visit /test-ai.')
  }
  return null
}