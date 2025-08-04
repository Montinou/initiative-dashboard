/**
 * File Upload Security Framework
 * Multi-layer security validation, virus scanning, and permission checks
 */

import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FileSecurityCheck {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number; // 0-100, higher is more secure
  checks: {
    fileType: boolean;
    fileSize: boolean;
    fileName: boolean;
    virusScan: boolean;
    contentValidation: boolean;
    permissionCheck: boolean;
  };
}

export interface VirusScanResult {
  status: 'clean' | 'infected' | 'failed' | 'skipped';
  details: {
    engine?: string;
    version?: string;
    scanTime?: number;
    threatName?: string;
    quarantined?: boolean;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  fileType: string;
  category: string;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface UserPermissionContext {
  userId: string;
  tenantId: string;
  areaId?: string;
  role: string;
  isSystemAdmin: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ALLOWED_FILE_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf'
  ],
  spreadsheets: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/tab-separated-values'
  ],
  presentations: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ]
} as const;

export const FILE_SIZE_LIMITS = {
  document: 50 * 1024 * 1024, // 50MB
  spreadsheet: 100 * 1024 * 1024, // 100MB
  presentation: 100 * 1024 * 1024, // 100MB
  image: 20 * 1024 * 1024, // 20MB
  archive: 200 * 1024 * 1024, // 200MB
  default: 10 * 1024 * 1024 // 10MB
} as const;

export const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.iso', '.msi', '.ps1', '.sh'
];

export const SUSPICIOUS_PATTERNS = [
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
  /[<>:"|?*]/, // Invalid filename characters
  /^\./,  // Hidden files
  /\.(tmp|temp|bak|old)$/i, // Temporary files
  /[^\x00-\x7F]/, // Non-ASCII characters (can be suspicious)
];

// ============================================================================
// MAIN SECURITY VALIDATION FUNCTION
// ============================================================================

export async function validateFileUploadSecurity(
  file: File,
  userContext: UserPermissionContext,
  targetAreaId?: string,
  targetInitiativeId?: string
): Promise<FileSecurityCheck> {
  const result: FileSecurityCheck = {
    isValid: true,
    errors: [],
    warnings: [],
    securityScore: 100,
    checks: {
      fileType: false,
      fileSize: false,
      fileName: false,
      virusScan: false,
      contentValidation: false,
      permissionCheck: false
    }
  };

  try {
    // 1. File Type Validation
    const fileTypeCheck = await validateFileType(file);
    result.checks.fileType = fileTypeCheck.isValid;
    if (!fileTypeCheck.isValid) {
      result.errors.push(...fileTypeCheck.errors);
      result.securityScore -= 25;
    }
    result.warnings.push(...fileTypeCheck.warnings);

    // 2. File Size Validation
    const fileSizeCheck = validateFileSize(file, fileTypeCheck.category);
    result.checks.fileSize = fileSizeCheck.isValid;
    if (!fileSizeCheck.isValid) {
      result.errors.push(...fileSizeCheck.errors);
      result.securityScore -= 15;
    }

    // 3. File Name Validation
    const fileNameCheck = validateFileName(file.name);
    result.checks.fileName = fileNameCheck.isValid;
    if (!fileNameCheck.isValid) {
      result.errors.push(...fileNameCheck.errors);
      result.securityScore -= 20;
    }
    result.warnings.push(...fileNameCheck.warnings);

    // 4. Permission Check
    const permissionCheck = await validateUploadPermissions(
      userContext,
      targetAreaId,
      targetInitiativeId,
      fileTypeCheck.category
    );
    result.checks.permissionCheck = permissionCheck.isValid;
    if (!permissionCheck.isValid) {
      result.errors.push(...permissionCheck.errors);
      result.securityScore -= 30;
    }

    // 5. Content Validation (basic)
    const contentCheck = await validateFileContent(file);
    result.checks.contentValidation = contentCheck.isValid;
    if (!contentCheck.isValid) {
      result.errors.push(...contentCheck.errors);
      result.securityScore -= 10;
    }
    result.warnings.push(...contentCheck.warnings);

    // 6. Virus Scan (placeholder - integrate with actual AV service)
    const virusCheck = await performVirusScan(file);
    result.checks.virusScan = virusCheck.status === 'clean' || virusCheck.status === 'skipped';
    if (virusCheck.status === 'infected') {
      result.errors.push(`File is infected: ${virusCheck.details.threatName || 'Unknown threat'}`);
      result.securityScore = 0; // Infected files get zero score
    } else if (virusCheck.status === 'failed') {
      result.warnings.push('Virus scan failed - file may need manual review');
      result.securityScore -= 5;
    }

    // Determine overall validity
    result.isValid = result.errors.length === 0 && result.securityScore >= 50;

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.securityScore = 0;
  }

  return result;
}

// ============================================================================
// FILE TYPE VALIDATION
// ============================================================================

export async function validateFileType(file: File): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: true,
    fileType: 'unknown',
    category: 'other',
    errors: [],
    warnings: [],
    metadata: {}
  };

  const mimeType = file.type;
  const extension = file.name.toLowerCase().split('.').pop() || '';

  // Check against allowed types
  for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (types.includes(mimeType as any)) {
      result.fileType = mimeType;
      result.category = category;
      result.isValid = true;
      break;
    }
  }

  // If MIME type not found, check by extension
  if (result.category === 'other') {
    const extensionMap: Record<string, string> = {
      'pdf': 'documents',
      'doc': 'documents',
      'docx': 'documents',
      'txt': 'documents',
      'rtf': 'documents',
      'xls': 'spreadsheets',
      'xlsx': 'spreadsheets',
      'csv': 'spreadsheets',
      'tsv': 'spreadsheets',
      'ppt': 'presentations',
      'pptx': 'presentations',
      'jpg': 'images',
      'jpeg': 'images',
      'png': 'images',
      'gif': 'images',
      'webp': 'images',
      'svg': 'images',
      'zip': 'archives',
      'rar': 'archives',
      '7z': 'archives'
    };

    if (extensionMap[extension]) {
      result.category = extensionMap[extension];
      result.fileType = mimeType || `application/${extension}`;
      result.warnings.push(`File type determined by extension (.${extension}) - MIME type may be incorrect`);
    }
  }

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    result.isValid = false;
    result.errors.push(`Dangerous file extension detected: ${extension}`);
  }

  // Validate MIME type consistency
  if (mimeType && !mimeType.includes(extension) && extension !== 'csv') {
    result.warnings.push(`MIME type (${mimeType}) may not match file extension (.${extension})`);
  }

  if (result.category === 'other') {
    result.isValid = false;
    result.errors.push(`Unsupported file type: ${mimeType || 'unknown'} (.${extension})`);
  }

  return result;
}

// ============================================================================
// FILE SIZE VALIDATION
// ============================================================================

export function validateFileSize(file: File, category: string): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    fileType: file.type,
    category,
    errors: [],
    warnings: [],
    metadata: { fileSize: file.size }
  };

  const limit = FILE_SIZE_LIMITS[category as keyof typeof FILE_SIZE_LIMITS] || FILE_SIZE_LIMITS.default;

  if (file.size > limit) {
    result.isValid = false;
    result.errors.push(`File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(limit)}) for ${category} files`);
  }

  if (file.size === 0) {
    result.isValid = false;
    result.errors.push('File is empty (0 bytes)');
  }

  // Warning for very large files (approaching limit)
  if (file.size > limit * 0.8) {
    result.warnings.push(`Large file size (${formatFileSize(file.size)}) - consider compressing if possible`);
  }

  return result;
}

// ============================================================================
// FILE NAME VALIDATION
// ============================================================================

export function validateFileName(fileName: string): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    fileType: 'unknown',
    category: 'unknown',
    errors: [],
    warnings: [],
    metadata: { originalName: fileName }
  };

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fileName)) {
      result.isValid = false;
      result.errors.push(`Suspicious filename pattern detected: ${fileName}`);
      break;
    }
  }

  // Check filename length
  if (fileName.length > 255) {
    result.isValid = false;
    result.errors.push('Filename too long (max 255 characters)');
  }

  if (fileName.length < 1) {
    result.isValid = false;
    result.errors.push('Filename cannot be empty');
  }

  // Check for null bytes
  if (fileName.includes('\0')) {
    result.isValid = false;
    result.errors.push('Filename contains null bytes');
  }

  // Warning for unusual characters
  if (/[^\w\-_. ]/.test(fileName)) {
    result.warnings.push('Filename contains special characters that may cause issues');
  }

  // Warning for multiple extensions
  const dots = fileName.split('.').length - 1;
  if (dots > 2) {
    result.warnings.push('Filename has multiple extensions - this may be suspicious');
  }

  return result;
}

// ============================================================================
// CONTENT VALIDATION
// ============================================================================

export async function validateFileContent(file: File): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: true,
    fileType: file.type,
    category: 'unknown',
    errors: [],
    warnings: [],
    metadata: {}
  };

  try {
    // Read first few bytes to check magic numbers
    const buffer = await file.slice(0, 512).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for common file signatures
    const signatures = {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      zip: [0x50, 0x4B, 0x03, 0x04], // PK (ZIP/Office docs)
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46, 0x38],
      exe: [0x4D, 0x5A], // MZ (Windows executable)
    };

    // Check for executable signatures
    if (bytesMatch(bytes, signatures.exe)) {
      result.isValid = false;
      result.errors.push('File contains executable code signature');
    }

    // Validate file signature matches claimed type
    if (file.type === 'application/pdf' && !bytesMatch(bytes, signatures.pdf)) {
      result.warnings.push('PDF file does not have expected signature');
    }

    if (file.type.startsWith('image/jpeg') && !bytesMatch(bytes, signatures.jpeg)) {
      result.warnings.push('JPEG file does not have expected signature');
    }

    if (file.type.startsWith('image/png') && !bytesMatch(bytes, signatures.png)) {
      result.warnings.push('PNG file does not have expected signature');
    }

    // Check for script content in non-script files
    if (!file.type.includes('javascript') && !file.type.includes('script')) {
      const text = new TextDecoder('utf-8').decode(bytes);
      const scriptPatterns = [
        /<script\b/i,
        /javascript:/i,
        /eval\s*\(/i,
        /onclick\s*=/i,
        /onload\s*=/i
      ];

      for (const pattern of scriptPatterns) {
        if (pattern.test(text)) {
          result.warnings.push('File contains script-like content');
          break;
        }
      }
    }

  } catch (error) {
    result.warnings.push('Could not validate file content - binary or corrupted file');
  }

  return result;
}

// ============================================================================
// VIRUS SCANNING
// ============================================================================

export async function performVirusScan(file: File): Promise<VirusScanResult> {
  // Antivirus integration will be added when enterprise security requirements are defined
  // For now, return a placeholder implementation
  
  const result: VirusScanResult = {
    status: 'skipped',
    details: {
      engine: 'placeholder',
      version: '1.0.0',
      scanTime: 0
    }
  };

  // In a real implementation, you would:
  // 1. Upload file to virus scanning service
  // 2. Wait for scan results
  // 3. Handle quarantine for infected files
  // 4. Return detailed scan results

  // For demonstration, mark executable files as potentially dangerous
  if (DANGEROUS_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    result.status = 'infected';
    result.details.threatName = 'Potentially dangerous file type';
  } else {
    result.status = 'clean';
  }

  return result;
}

// ============================================================================
// PERMISSION VALIDATION
// ============================================================================

export async function validateUploadPermissions(
  userContext: UserPermissionContext,
  targetAreaId?: string,
  targetInitiativeId?: string,
  fileCategory?: string
): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: true,
    fileType: 'unknown',
    category: fileCategory || 'unknown',
    errors: [],
    warnings: [],
    metadata: {}
  };

  try {
    const supabase = createClient();

    // System admins can upload anywhere
    if (userContext.isSystemAdmin) {
      return result;
    }

    // CEO and Admin can upload to any area in their tenant
    if (['CEO', 'Admin'].includes(userContext.role)) {
      return result;
    }

    // Check area-specific permissions
    if (targetAreaId) {
      // Managers can only upload to their own area
      if (userContext.role === 'Manager') {
        if (userContext.areaId !== targetAreaId) {
          result.isValid = false;
          result.errors.push('Managers can only upload files to their own area');
        }
      }
      
      // Analysts can upload to their area with restrictions
      if (userContext.role === 'Analyst') {
        if (userContext.areaId !== targetAreaId) {
          result.isValid = false;
          result.errors.push('Analysts can only upload files to their own area');
        }
        
        // Analysts may have restrictions on file types
        if (fileCategory === 'archive' || fileCategory === 'presentation') {
          result.warnings.push('Analysts uploading archives or presentations may need manager approval');
        }
      }
    }

    // Check initiative-specific permissions
    if (targetInitiativeId) {
      const { data: initiative, error } = await supabase
        .from('initiatives')
        .select('area_id, created_by, owner_id')
        .eq('id', targetInitiativeId)
        .single();

      if (error || !initiative) {
        result.isValid = false;
        result.errors.push('Initiative not found or access denied');
        return result;
      }

      // Check if user has access to the initiative's area
      if (initiative.area_id && initiative.area_id !== userContext.areaId && 
          !['CEO', 'Admin'].includes(userContext.role)) {
        result.isValid = false;
        result.errors.push('Cannot upload files to initiatives outside your area');
      }
    }

    // File upload quotas will be implemented based on business requirements
    // const quotaCheck = await checkUserUploadQuota(userContext.userId);
    // if (!quotaCheck.canUpload) {
    //   result.isValid = false;
    //   result.errors.push('Upload quota exceeded');
    // }

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Permission validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

// ============================================================================
// FILE HASH AND DEDUPLICATION
// ============================================================================

export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkFileDuplication(
  fileHash: string,
  tenantId: string,
  areaId?: string
): Promise<{ isDuplicate: boolean; existingFile?: any }> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('uploaded_files')
      .select('id, original_filename, created_at, uploaded_by')
      .eq('file_hash', fileHash)
      .eq('tenant_id', tenantId)
      .neq('upload_status', 'deleted');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error checking file duplication:', error);
      return { isDuplicate: false };
    }

    return {
      isDuplicate: data && data.length > 0,
      existingFile: data && data[0]
    };
  } catch (error) {
    console.error('Error in checkFileDuplication:', error);
    return { isDuplicate: false };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function bytesMatch(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function sanitizeFileName(fileName: string): string {
  // Remove dangerous characters and patterns
  return fileName
    .replace(/[<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

export function generateSecureFileName(originalName: string, userId: string): string {
  const extension = originalName.split('.').pop() || '';
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const userPrefix = userId.substring(0, 8);
  
  return `${userPrefix}_${timestamp}_${random}.${extension}`;
}