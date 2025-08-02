import { SWRConfiguration } from "swr"

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  fetcher: async (url: string) => {
    const res = await fetch(url)
    
    if (!res.ok) {
      const error = new Error("An error occurred while fetching the data.")
      // @ts-ignore
      error.info = await res.json()
      // @ts-ignore
      error.status = res.status
      throw error
    }
    
    return res.json()
  },
}