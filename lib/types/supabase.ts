// Re-export all types from the new database types file
export * from './database'

// For backward compatibility, re-export Database interface
export type { Database } from './database'