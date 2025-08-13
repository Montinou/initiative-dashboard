import { createHash } from 'crypto';

/**
 * Calculate SHA256 checksum from buffer or string
 */
export function calculateChecksum(data: Buffer | string): string {
  const hash = createHash('sha256');
  
  if (typeof data === 'string') {
    hash.update(data, 'utf8');
  } else {
    hash.update(data);
  }
  
  return hash.digest('hex');
}

/**
 * Calculate checksum from file buffer
 */
export function calculateFileChecksum(fileBuffer: Buffer): string {
  return calculateChecksum(fileBuffer);
}

/**
 * Calculate checksum from CSV string content
 */
export function calculateCSVChecksum(csvContent: string): string {
  return calculateChecksum(csvContent);
}