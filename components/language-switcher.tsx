'use client';

import { useLocale } from '@/hooks/useLocale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const;

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'select';
  className?: string;
  showFlag?: boolean;
  showLabel?: boolean;
}

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  className,
  showFlag = true,
  showLabel = true
}: LanguageSwitcherProps) {
  const { locale, setLocale, isPending } = useLocale();
  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  if (variant === 'select') {
    return (
      <Select
        value={locale}
        onValueChange={(value) => setLocale(value as typeof languages[number]['code'])}
        disabled={isPending}
      >
        <SelectTrigger className={cn("w-[140px]", className)}>
          <Globe className="w-4 h-4 mr-2" />
          <SelectValue>
            {showFlag && `${currentLanguage.flag} `}
            {showLabel && currentLanguage.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {showFlag && `${lang.flag} `}
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("gap-2", className)}
          disabled={isPending}
        >
          <Globe className="w-4 h-4" />
          {showFlag && currentLanguage.flag}
          {showLabel && (
            <span className="hidden sm:inline">{currentLanguage.name}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={cn(
              "cursor-pointer",
              locale === lang.code && "bg-accent"
            )}
          >
            {showFlag && <span className="mr-2">{lang.flag}</span>}
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}