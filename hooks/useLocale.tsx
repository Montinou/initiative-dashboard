'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale as useIntlLocale } from 'next-intl';
import type { Locale } from '@/i18n-config';

export function useLocale() {
  const locale = useIntlLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale === locale) return; // No change needed
    
    startTransition(() => {
      // Set cookie for locale preference
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      
      // Force a full page reload to properly apply the new locale
      // This ensures the NextIntlClientProvider gets re-initialized with new messages
      window.location.reload();
    });
  }, [router, locale]);

  return {
    locale,
    setLocale,
    isPending,
  };
}