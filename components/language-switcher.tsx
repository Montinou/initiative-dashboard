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
        <SelectTrigger className={cn(
          "w-[160px] h-10 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 transition-all",
          "flex items-center gap-2 px-3",
          className
        )}>
          <div className="flex items-center gap-2 flex-1">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-lg">{showFlag && currentLanguage.flag}</span>
            {showLabel && (
              <span className="font-medium text-sm">{currentLanguage.name}</span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="w-[160px]">
          {languages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="flex items-center gap-2 py-2"
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
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