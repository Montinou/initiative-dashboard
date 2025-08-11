<task name="Spanish-English Translation Implementation">

<task_objective>
Implement full Spanish-English internationalization (i18n) for the initiative-dashboard application using next-intl with Next.js App Router. The workflow will translate all user-facing content to Spanish by default while maintaining English support, implementing SSR-compatible i18n infrastructure, and allowing user language preference persistence without altering business logic or database content.
</task_objective>

<detailed_sequence_steps>
# Spanish-English Translation Implementation - Babysteps Approach

## Phase 0: Discovery and Setup

### 0.1 Create tracking log
1. Create `docs/i18n-babysteps-log.md` to track progress
2. Document initial state and plan

### 0.2 Audit current strings
1. Search for hardcoded strings in JSX components using pattern: `>[^<]*[A-Za-z][^<]*<`
2. Search for placeholders/labels: `(placeholder|aria-label|title|alt)\s*=\s*["'][^"']*[A-Za-z][^"']*["']`
3. Search for toasts/errors: `(toast|notify|alert|console\.error)\(.*["'][A-Za-z].*["']`
4. Document findings in log

## Phase 1: i18n Infrastructure Setup

### 1.1 Install dependencies
```bash
pnpm add next-intl
pnpm add -D @types/intl-messageformat
```

### 1.2 Create locales directory structure
```
/locales
  /es
    common.json
    navigation.json
    dashboard.json
    auth.json
    forms.json
    stratix.json
    errors.json
    validation.json
    dates.json
  /en
    (same files as /es)
```

### 1.3 Create i18n helper library
1. Create `lib/i18n.ts` with:
   - `getMessagesFor(locale)` function
   - `formatDate()` helper with Intl support
   - `formatNumber()` helper
   - `formatCurrency()` helper

### 1.4 Configure Next.js
1. Update `next.config.mjs` to add i18n configuration
2. Set locales: ['es', 'en']
3. Set defaultLocale: 'es'

### 1.5 Update middleware
1. Modify `middleware.ts` to handle locale negotiation
2. Integrate with existing Supabase session middleware
3. Check cookie `NEXT_LOCALE` first, then Accept-Language header
4. Set default to 'es'

## Phase 2: Core String Extraction

### 2.1 Extract layout strings
1. Update `app/layout.tsx` with translation support
2. Extract all hardcoded text to `locales/es/common.json`
3. Create English translations in `locales/en/common.json`

### 2.2 Extract navigation strings
1. Find all navigation components
2. Replace hardcoded menu items with translations
3. Update breadcrumbs and navigation labels

### 2.3 Extract auth flow strings
1. Update login/signup forms
2. Translate error messages
3. Update password reset flows
4. Translate success messages

### 2.4 Extract toast messages
1. Search for all toast calls
2. Create translation keys for each message
3. Update toast implementations

## Phase 3: Dashboard and Stratix Components

### 3.1 Dashboard widgets
1. Translate dashboard titles and labels
2. Update metric labels
3. Translate chart labels and tooltips

### 3.2 Stratix AI components
1. Update Stratix assistant messages
2. Translate UI elements in Stratix widgets
3. Maintain AI responses in their original language

### 3.3 Data tables
1. Translate column headers
2. Update filter labels
3. Translate pagination text
4. Update empty state messages

## Phase 4: Forms and Validations

### 4.1 Form field labels
1. Extract all form field labels
2. Create consistent translation keys
3. Update form components

### 4.2 Placeholders
1. Find all input placeholders
2. Create translation entries
3. Update components

### 4.3 Validation messages
1. Extract Zod validation messages
2. Create translation function for validators
3. Update all schema definitions

### 4.4 Error messages
1. Centralize error message translations
2. Update error boundaries
3. Translate API error responses for UI

## Phase 5: Domain Mappings and Formatting

### 5.1 Create domain mapper
1. Create `lib/i18n-domain.ts`
2. Add enum mappers for:
   - status (planning, in_progress, completed, on_hold)
   - priority (high, medium, low)
   - roles (CEO, Admin, Manager)
   - invitation_status
   - quarter_name (Q1, Q2, Q3, Q4)

### 5.2 Date formatting
1. Implement locale-aware date formatting
2. Use tenant timezone from database
3. Apply to all date displays

### 5.3 Number and currency formatting
1. Implement locale-aware number formatting
2. Add currency formatting support
3. Apply to metrics and financial data

## Phase 6: Language Selector and Persistence

### 6.1 Create language switcher component
1. Create `components/common/LanguageSwitcher.tsx`
2. Add to navbar or user profile dropdown
3. Style to match existing UI

### 6.2 Database migration
1. Create migration to add `locale` column to `user_profiles` table
2. Set default value to 'es'
3. Add check constraint for valid values ('es', 'en')

### 6.3 Create API endpoint
1. Create `app/api/profile/locale/route.ts`
2. Implement PATCH method to update user locale preference
3. Follow existing API patterns

### 6.4 Implement persistence
1. Update cookie on language change
2. Save preference to database for authenticated users
3. Load preference on login

## Phase 7: Provider Setup and SSR

### 7.1 Update providers
1. Modify `app/providers.tsx` to accept:
   - initialLocale
   - initialMessages
   - initialSession
   - initialProfile
2. Wrap with NextIntlClientProvider

### 7.2 Implement SSR hydration
1. Load messages server-side in layout
2. Pass initial data to providers
3. Prevent hydration mismatch

### 7.3 Update auth flow
1. Ensure session is passed from server
2. Prevent auth flicker
3. Maintain locale during auth redirects

## Phase 8: Testing and Quality Assurance

### 8.1 Unit tests
1. Test i18n helper functions
2. Test domain mappers
3. Test formatting functions
4. Test language switcher component

### 8.2 E2E tests
1. Test language switching flow
2. Verify Spanish text appears correctly
3. Test persistence across sessions
4. Verify all critical user paths

### 8.3 Coverage audit
1. Search for remaining hardcoded strings
2. Verify all user-facing text is translated
3. Check accessibility labels
4. Review meta tags and SEO content

### 8.4 Performance check
1. Verify SSR performance
2. Check bundle size impact
3. Test loading times
4. Optimize message loading if needed

## Implementation Commands

### Search for hardcoded strings
```bash
# Find JSX text content
grep -r ">[^<]*[A-Za-z][^<]*<" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next

# Find attributes with text
grep -r '(placeholder|aria-label|title|alt)\s*=\s*["'][^"']*[A-Za-z][^"']*["']' --include="*.tsx" --include="*.jsx"

# Find toast messages
grep -r "(toast|notify|alert)" --include="*.ts" --include="*.tsx"
```

### Run tests
```bash
pnpm lint
pnpm test
pnpm test:e2e
```

## Rollback Plan

1. Each phase is a separate PR that can be reverted independently
2. Feature flag: `APP_I18N_ENABLED` environment variable if needed
3. Backup database before adding locale column
4. Keep English translations as fallback

## Success Criteria

- [ ] All UI text is in Spanish by default for anonymous users
- [ ] Authenticated users can switch between Spanish and English
- [ ] Language preference persists across sessions
- [ ] No business logic or database content is modified
- [ ] All forms, validations, and errors are translated
- [ ] Dates and numbers format according to locale
- [ ] E2E tests pass with Spanish locale
- [ ] No SSR hydration errors
- [ ] Performance impact is minimal (<100ms added to initial load)

</detailed_sequence_steps>

</task>