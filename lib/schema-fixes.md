# Database Schema vs API Mismatches

## Key Schema Differences Found:

### 1. `initiatives` table:
- **Uses `title`** (NOT `name`)
- Has `owner_id` (references auth.users)
- Has `created_by` (references user_profiles)
- Has `target_date` and `completion_date`
- Has `budget` and `actual_cost`
- Has `priority` field

### 2. `user_profiles` table:
- Has `area` as TEXT (not a foreign key)
- `role` is USER-DEFINED type (custom enum)
- Has `is_system_admin` boolean

### 3. `areas` table:
- Correct as implemented

### 4. `activities` table exists:
- Links to initiatives
- Has `assigned_to` (auth.users)
- Has `due_date`

### 5. `subtasks` table exists:
- Links to initiatives
- Has `completed` boolean

## APIs that need fixing:

1. **InitiativeDashboard** component - may be using 'name' instead of 'title'
2. **Any API creating initiatives** - must use 'title' not 'name'
3. **Progress tracking** - should consider using `progress_history` table
4. **User assignments** - should use `owner_id` for initiatives

## Required Changes:
- Update all initiative queries to use `title` instead of `name`
- Consider implementing activities and subtasks for better tracking
- Use proper date fields (target_date, completion_date)
- Implement budget tracking if needed