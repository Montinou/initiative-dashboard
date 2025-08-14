'use client';

import { useCallback, useTransition, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale as useIntlLocale } from 'next-intl';
import type { Locale } from '@/i18n-config';

export function useLocale() {
  const locale = useIntlLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isChanging, setIsChanging] = useState(false);

  // Get the current locale from cookie
  const getCurrentLocale = useCallback(() => {
    const cookies = document.cookie.split('; ');
    const localeCookie = cookies.find(cookie => cookie.startsWith('NEXT_LOCALE='));
    return localeCookie ? localeCookie.split('=')[1] as Locale : locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    const currentLocale = getCurrentLocale();
    if (newLocale === currentLocale) return; // No change needed
    
    setIsChanging(true);
    
    // Set cookie for locale preference with proper attributes
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
    
    // Small delay to ensure cookie is set
    setTimeout(() => {
      // Force a full page reload to properly apply the new locale
      // This ensures the NextIntlClientProvider gets re-initialized with new messages
      window.location.reload();
    }, 100);
  }, [getCurrentLocale]);

  // Reset changing state if component unmounts or changes
  useEffect(() => {
    return () => setIsChanging(false);
  }, []);

  return {
    locale,
    setLocale,
    isPending: isPending || isChanging,
    getCurrentLocale,
  };
}