"use client"

import { GlobalLoadingBar, GlobalLoadingIndicator } from './global-loading-indicator'

export function ClientLoadingWrapper() {
  return (
    <>
      <GlobalLoadingBar />
      <GlobalLoadingIndicator />
    </>
  )
}