/**
 * Upload File Validators
 * 
 * Provides validation functions for OKR import files
 * Ensures data integrity and format compliance
 */

import { parse, isValid, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types for validation results
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  processedData?: any;
}

export interface ValidationError {
  row?: number;
  column?: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  row?: number;
  column?: string;
  message: string;
  suggestion?: string;
}

// Valid values for enum fields
export const VALID_STATUSES = {
  planning: ['planificación', 'planificacion', 'planning', 'planeación'],
  in_progress: ['en_progreso', 'en progreso', 'in_progress', 'in progress', 'activo', 'active'],
  completed: ['completado', 'completed', 'finalizado', 'terminado', 'finished', 'done'],
  on_hold: ['en_espera', 'en espera', 'on_hold', 'on hold', 'pausado', 'paused', 'detenido']
};

export const VALID_PRIORITIES = {
  high: ['alta', 'high', 'crítica', 'critica', 'critical', 'urgente', 'urgent'],
  medium: ['media', 'medium', 'normal', 'moderate'],
  low: ['baja', 'low', 'minor']
};

export const BOOLEAN_TRUE_VALUES = [
  'sí', 'si', 'yes', 'true', '1', 'completado', 'completed', 'done', '✓', '✔'
];

export const BOOLEAN_FALSE_VALUES = [
  'no', 'false', '0', 'pendiente', 'pending', 'incomplete', '✗', '✘'
];

/**
 * Validate required columns are present
 */
export function validateRequiredColumns(
  headers: string[],
  requiredColumns: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));

  for (const required of requiredColumns) {
    const normalizedRequired = normalizeColumnName(required);
    if (!normalizedHeaders.includes(normalizedRequired)) {
      errors.push({
        column: required,
        message: `Columna requerida faltante: "${required}"`
      });
    }
  }

  return errors;
}

/**
 * Validate progress value (0-100)
 */
export function validateProgress(
  value: any,
  row?: number
): { value: number; error?: ValidationError } {
  if (value === undefined || value === null || value === '') {
    return {
      value: 0,
      error: {
        row,
        column: 'Progreso',
        message: 'Valor de progreso faltante',
        value
      }
    };
  }

  let progress = 0;

  if (typeof value === 'number') {
    progress = value;
  } else {
    // Remove % sign and parse
    const cleanValue = value.toString().replace('%', '').trim();
    progress = parseFloat(cleanValue);
  }

  if (isNaN(progress)) {
    return {
      value: 0,
      error: {
        row,
        column: 'Progreso',
        message: `Valor de progreso inválido: "${value}"`,
        value
      }
    };
  }

  // Convert decimal to percentage if needed
  if (progress > 0 && progress <= 1) {
    progress = progress * 100;
  }

  // Clamp to 0-100 range
  if (progress < 0 || progress > 100) {
    return {
      value: Math.max(0, Math.min(100, progress)),
      error: {
        row,
        column: 'Progreso',
        message: `Progreso fuera de rango (0-100): ${progress}`,
        value
      }
    };
  }

  return { value: Math.round(progress) };
}

/**
 * Validate and normalize status value
 */
export function validateStatus(
  value: any,
  row?: number
): { value: string; warning?: ValidationWarning } {
  if (!value) {
    return { value: 'planning' }; // Default status
  }

  const normalizedValue = value.toString().toLowerCase().trim();

  // Check each valid status
  for (const [systemValue, validValues] of Object.entries(VALID_STATUSES)) {
    if (validValues.includes(normalizedValue)) {
      return { value: systemValue };
    }
  }

  // If no match, return default with warning
  return {
    value: 'planning',
    warning: {
      row,
      column: 'Estado',
      message: `Estado no reconocido: "${value}"`,
      suggestion: 'Se usará "planning" por defecto'
    }
  };
}

/**
 * Validate and normalize priority value
 */
export function validatePriority(
  value: any,
  row?: number
): { value: string; warning?: ValidationWarning } {
  if (!value) {
    return { value: 'medium' }; // Default priority
  }

  const normalizedValue = value.toString().toLowerCase().trim();

  // Check each valid priority
  for (const [systemValue, validValues] of Object.entries(VALID_PRIORITIES)) {
    if (validValues.includes(normalizedValue)) {
      return { value: systemValue };
    }
  }

  // If no match, return default with warning
  return {
    value: 'medium',
    warning: {
      row,
      column: 'Prioridad',
      message: `Prioridad no reconocida: "${value}"`,
      suggestion: 'Se usará "medium" por defecto'
    }
  };
}

/**
 * Validate and parse date value
 */
export function validateDate(
  value: any,
  column: string,
  row?: number
): { value: string | null; error?: ValidationError } {
  if (!value) {
    return { value: null }; // Dates are optional
  }

  // Handle Excel serial dates
  if (typeof value === 'number') {
    // Excel dates start from 1900-01-01
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
    
    if (isValid(date)) {
      return { value: format(date, 'yyyy-MM-dd') };
    }
  }

  // Try multiple date formats
  const dateFormats = [
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'yyyy-MM-dd',
    'dd/MM/yy',
    'MM/dd/yyyy',
    'yyyy/MM/dd'
  ];

  const dateStr = value.toString().trim();

  for (const formatStr of dateFormats) {
    try {
      const parsedDate = parse(dateStr, formatStr, new Date(), { locale: es });
      if (isValid(parsedDate)) {
        return { value: format(parsedDate, 'yyyy-MM-dd') };
      }
    } catch {
      // Try next format
    }
  }

  // If no format worked, try native Date parsing
  const nativeDate = new Date(dateStr);
  if (isValid(nativeDate)) {
    return { value: format(nativeDate, 'yyyy-MM-dd') };
  }

  return {
    value: null,
    error: {
      row,
      column,
      message: `Formato de fecha no reconocido: "${value}"`,
      value
    }
  };
}

/**
 * Validate date range (start date before end date)
 */
export function validateDateRange(
  startDate: string | null,
  endDate: string | null,
  row?: number
): ValidationError | null {
  if (!startDate || !endDate) {
    return null; // Both dates are optional
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return {
      row,
      message: `Fecha de inicio (${startDate}) es posterior a fecha fin (${endDate})`
    };
  }

  return null;
}

/**
 * Validate boolean value
 */
export function validateBoolean(
  value: any,
  column: string,
  row?: number
): boolean {
  if (!value) {
    return false; // Default to false
  }

  const normalizedValue = value.toString().toLowerCase().trim();

  if (BOOLEAN_TRUE_VALUES.includes(normalizedValue)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.includes(normalizedValue)) {
    return false;
  }

  // If not recognized, default to false
  return false;
}

/**
 * Validate area exists (for multi-area imports)
 */
export function validateArea(
  value: string,
  validAreas: string[],
  row?: number
): { value: string; error?: ValidationError } {
  if (!value) {
    return {
      value: '',
      error: {
        row,
        column: 'Área',
        message: 'Área es requerida para importación multi-área',
        value
      }
    };
  }

  const normalizedValue = value.trim();
  const normalizedAreas = validAreas.map(a => a.toLowerCase());
  
  // Check exact match first
  if (validAreas.includes(normalizedValue)) {
    return { value: normalizedValue };
  }

  // Check case-insensitive match
  const index = normalizedAreas.indexOf(normalizedValue.toLowerCase());
  if (index !== -1) {
    return { value: validAreas[index] };
  }

  // Check for common variations
  const areaVariations: { [key: string]: string[] } = {
    'RRHH': ['Recursos Humanos', 'RH', 'HR', 'Capital Humano'],
    'Comercial': ['Ventas', 'Sales', 'Comercialización'],
    'IT': ['Sistemas', 'Tecnología', 'TI', 'Informática'],
    'Administración': ['Admin', 'Administrativa', 'Administracion']
  };

  for (const [area, variations] of Object.entries(areaVariations)) {
    if (variations.some(v => v.toLowerCase() === normalizedValue.toLowerCase())) {
      // Check if this standard area exists
      const standardIndex = normalizedAreas.indexOf(area.toLowerCase());
      if (standardIndex !== -1) {
        return { value: validAreas[standardIndex] };
      }
    }
  }

  return {
    value: normalizedValue,
    error: {
      row,
      column: 'Área',
      message: `Área "${value}" no encontrada en el sistema`,
      value
    }
  };
}

/**
 * Validate non-empty required field
 */
export function validateRequired(
  value: any,
  column: string,
  row?: number
): { value: string; error?: ValidationError } {
  if (!value || value.toString().trim() === '') {
    return {
      value: '',
      error: {
        row,
        column,
        message: `${column} es requerido`,
        value
      }
    };
  }

  return { value: value.toString().trim() };
}

/**
 * Normalize column name for matching
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Validate entire row of data
 */
export function validateRow(
  row: any[],
  headers: string[],
  rowNumber: number,
  options: {
    validAreas?: string[];
    requireArea?: boolean;
  } = {}
): {
  data: any;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const processedData: any = {};

  // Map headers to indices
  const columnMap: { [key: string]: number } = {};
  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);
    columnMap[normalized] = index;
  });

  // Validate Área (if multi-area)
  if (options.requireArea) {
    const areaIndex = columnMap['area'];
    if (areaIndex !== undefined) {
      const areaResult = validateArea(row[areaIndex], options.validAreas || [], rowNumber);
      processedData.area = areaResult.value;
      if (areaResult.error) errors.push(areaResult.error);
    } else {
      errors.push({
        row: rowNumber,
        column: 'Área',
        message: 'Columna Área es requerida para importación multi-área'
      });
    }
  }

  // Validate Objetivo
  const objetivoIndex = columnMap['objetivo'];
  if (objetivoIndex !== undefined) {
    const objetivoResult = validateRequired(row[objetivoIndex], 'Objetivo', rowNumber);
    processedData.objetivo = objetivoResult.value;
    if (objetivoResult.error) errors.push(objetivoResult.error);
  }

  // Validate Iniciativa
  const iniciativaIndex = columnMap['iniciativa'];
  if (iniciativaIndex !== undefined) {
    const iniciativaResult = validateRequired(row[iniciativaIndex], 'Iniciativa', rowNumber);
    processedData.iniciativa = iniciativaResult.value;
    if (iniciativaResult.error) errors.push(iniciativaResult.error);
  }

  // Validate Progreso
  const progresoIndex = columnMap['progreso'];
  if (progresoIndex !== undefined) {
    const progresoResult = validateProgress(row[progresoIndex], rowNumber);
    processedData.progreso = progresoResult.value;
    if (progresoResult.error) errors.push(progresoResult.error);
  }

  // Validate Estado
  const estadoIndex = columnMap['estado'];
  if (estadoIndex !== undefined) {
    const estadoResult = validateStatus(row[estadoIndex], rowNumber);
    processedData.estado = estadoResult.value;
    if (estadoResult.warning) warnings.push(estadoResult.warning);
  }

  // Validate Prioridad
  const prioridadIndex = columnMap['prioridad'];
  if (prioridadIndex !== undefined) {
    const prioridadResult = validatePriority(row[prioridadIndex], rowNumber);
    processedData.prioridad = prioridadResult.value;
    if (prioridadResult.warning) warnings.push(prioridadResult.warning);
  }

  // Validate Fechas
  const fechaInicioIndex = columnMap['fecha_inicio'];
  if (fechaInicioIndex !== undefined) {
    const fechaResult = validateDate(row[fechaInicioIndex], 'Fecha Inicio', rowNumber);
    processedData.fechaInicio = fechaResult.value;
    if (fechaResult.error) errors.push(fechaResult.error);
  }

  const fechaFinIndex = columnMap['fecha_fin'];
  if (fechaFinIndex !== undefined) {
    const fechaResult = validateDate(row[fechaFinIndex], 'Fecha Fin', rowNumber);
    processedData.fechaFin = fechaResult.value;
    if (fechaResult.error) errors.push(fechaResult.error);
  }

  // Validate date range
  if (processedData.fechaInicio && processedData.fechaFin) {
    const rangeError = validateDateRange(processedData.fechaInicio, processedData.fechaFin, rowNumber);
    if (rangeError) errors.push(rangeError);
  }

  // Copy other fields as-is
  const descripcionIndex = columnMap['descripcion'];
  if (descripcionIndex !== undefined) {
    processedData.descripcion = row[descripcionIndex]?.toString().trim() || '';
  }

  const responsableIndex = columnMap['responsable'];
  if (responsableIndex !== undefined) {
    processedData.responsable = row[responsableIndex]?.toString().trim() || '';
  }

  return {
    data: processedData,
    errors,
    warnings
  };
}

/**
 * Validate entire file
 */
export function validateFile(
  data: any[][],
  options: {
    validAreas?: string[];
    requireArea?: boolean;
    maxRows?: number;
  } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const processedData: any[] = [];

  // Check if file has data
  if (!data || data.length < 2) {
    errors.push({
      message: 'El archivo debe contener al menos una fila de encabezados y una fila de datos'
    });
    return { isValid: false, errors, warnings };
  }

  // Check max rows
  const maxRows = options.maxRows || 10000;
  if (data.length > maxRows) {
    errors.push({
      message: `El archivo excede el límite de ${maxRows} filas`
    });
    return { isValid: false, errors, warnings };
  }

  // Get headers (first row)
  const headers = data[0].map(h => h?.toString() || '');

  // Validate required columns
  const requiredColumns = options.requireArea
    ? ['Área', 'Objetivo', 'Iniciativa', 'Progreso']
    : ['Objetivo', 'Iniciativa', 'Progreso'];

  const columnErrors = validateRequiredColumns(headers, requiredColumns);
  errors.push(...columnErrors);

  if (columnErrors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Validate each data row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
      continue;
    }

    const rowResult = validateRow(row, headers, i + 1, options);
    
    errors.push(...rowResult.errors);
    warnings.push(...rowResult.warnings);
    
    // Only add row if it has required fields
    if (rowResult.data.objetivo && rowResult.data.iniciativa) {
      processedData.push(rowResult.data);
    }
  }

  // Check if we have any valid data
  if (processedData.length === 0) {
    errors.push({
      message: 'No se encontraron datos válidos para importar'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    processedData
  };
}