/**
 * Robust area name matching system for Excel uploads
 * 
 * This system provides multiple matching strategies to maximize the probability
 * of correctly matching Excel sheet names to database areas, even with slight
 * variations in formatting, accents, or casing.
 */

export interface AreaMatchResult {
  matched: boolean;
  areaId?: string;
  areaName?: string;
  confidence: number;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'keyword';
  normalizedInput?: string;
  normalizedTarget?: string;
}

export interface DatabaseArea {
  id: string;
  name: string;
  tenant_id: string;
}

/**
 * Normalize text for matching by:
 * - Converting to uppercase
 * - Removing accents/diacritics
 * - Removing extra whitespace
 * - Removing special characters
 */
export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove special characters except word chars and spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching with edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
}

/**
 * Extract keywords from area names for keyword-based matching
 */
function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const keywords = normalized.split(' ').filter(word => word.length > 2);
  
  // Add common synonyms and variations
  const synonymMap: Record<string, string[]> = {
    'ADMINISTRACION': ['ADMIN', 'ADMINISTRATIVO', 'GESTION'],
    'PRODUCTO': ['PRODUCTOS', 'PRODUCT'],
    'CAPITAL': ['HUMANO', 'RRHH', 'RECURSOS', 'PERSONAL'],
    'HUMANO': ['CAPITAL', 'RRHH', 'RECURSOS', 'PERSONAL'],
    'COMERCIAL': ['VENTAS', 'SALES', 'MARKETING', 'COMERCIO']
  };
  
  const expandedKeywords = [...keywords];
  keywords.forEach(keyword => {
    if (synonymMap[keyword]) {
      expandedKeywords.push(...synonymMap[keyword]);
    }
  });
  
  return [...new Set(expandedKeywords)];
}

/**
 * Match Excel sheet name to database area using multiple strategies
 */
export function matchAreaName(
  sheetName: string, 
  areas: DatabaseArea[]
): AreaMatchResult {
  const normalizedSheet = normalizeText(sheetName);
  
  // Strategy 1: Exact match (highest confidence)
  for (const area of areas) {
    if (area.name === sheetName) {
      return {
        matched: true,
        areaId: area.id,
        areaName: area.name,
        confidence: 1.0,
        matchType: 'exact'
      };
    }
  }
  
  // Strategy 2: Normalized match (high confidence)
  for (const area of areas) {
    const normalizedArea = normalizeText(area.name);
    if (normalizedArea === normalizedSheet) {
      return {
        matched: true,
        areaId: area.id,
        areaName: area.name,
        confidence: 0.95,
        matchType: 'normalized',
        normalizedInput: normalizedSheet,
        normalizedTarget: normalizedArea
      };
    }
  }
  
  // Strategy 3: Fuzzy match with similarity threshold (medium confidence)
  let bestMatch: AreaMatchResult | null = null;
  for (const area of areas) {
    const normalizedArea = normalizeText(area.name);
    const similarity = calculateSimilarity(normalizedSheet, normalizedArea);
    
    if (similarity >= 0.8 && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = {
        matched: true,
        areaId: area.id,
        areaName: area.name,
        confidence: similarity * 0.8, // Scale down for fuzzy matches
        matchType: 'fuzzy',
        normalizedInput: normalizedSheet,
        normalizedTarget: normalizedArea
      };
    }
  }
  
  if (bestMatch) {
    return bestMatch;
  }
  
  // Strategy 4: Keyword-based matching (lower confidence)
  const sheetKeywords = extractKeywords(sheetName);
  for (const area of areas) {
    const areaKeywords = extractKeywords(area.name);
    
    // Check for keyword overlap
    const commonKeywords = sheetKeywords.filter(keyword => 
      areaKeywords.some(areaKeyword => areaKeyword.includes(keyword) || keyword.includes(areaKeyword))
    );
    
    if (commonKeywords.length > 0) {
      const keywordScore = commonKeywords.length / Math.max(sheetKeywords.length, areaKeywords.length);
      if (keywordScore >= 0.5) {
        return {
          matched: true,
          areaId: area.id,
          areaName: area.name,
          confidence: keywordScore * 0.6, // Lower confidence for keyword matches
          matchType: 'keyword',
          normalizedInput: normalizedSheet,
          normalizedTarget: normalizeText(area.name)
        };
      }
    }
  }
  
  // No match found
  return {
    matched: false,
    confidence: 0,
    matchType: 'exact', // Default
    normalizedInput: normalizedSheet
  };
}

/**
 * Batch match multiple sheet names to areas
 */
export function matchMultipleAreas(
  sheetNames: string[],
  areas: DatabaseArea[]
): Record<string, AreaMatchResult> {
  const results: Record<string, AreaMatchResult> = {};
  
  for (const sheetName of sheetNames) {
    results[sheetName] = matchAreaName(sheetName, areas);
  }
  
  return results;
}

/**
 * Get area matching suggestions for unmatched sheets
 */
export function getMatchingSuggestions(
  sheetName: string,
  areas: DatabaseArea[],
  limit: number = 3
): Array<{ area: DatabaseArea; confidence: number; reason: string }> {
  const suggestions = areas.map(area => {
    const normalizedSheet = normalizeText(sheetName);
    const normalizedArea = normalizeText(area.name);
    const similarity = calculateSimilarity(normalizedSheet, normalizedArea);
    
    let reason = '';
    if (similarity > 0.6) {
      reason = `Similar name (${Math.round(similarity * 100)}% match)`;
    } else {
      const sheetKeywords = extractKeywords(sheetName);
      const areaKeywords = extractKeywords(area.name);
      const commonKeywords = sheetKeywords.filter(keyword => 
        areaKeywords.some(areaKeyword => areaKeyword.includes(keyword))
      );
      
      if (commonKeywords.length > 0) {
        reason = `Common keywords: ${commonKeywords.join(', ')}`;
      } else {
        reason = 'Potential match';
      }
    }
    
    return {
      area,
      confidence: similarity,
      reason
    };
  })
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, limit);
  
  return suggestions;
}

/**
 * Validate that expected SIGA areas are present in sheet names
 */
export function validateSIGASheets(sheetNames: string[]): {
  valid: boolean;
  missing: string[];
  extra: string[];
  suggestions: string[];
} {
  const expectedAreas = ['Administración', 'Producto', 'Capital Humano', 'Comercial'];
  const normalizedExpected = expectedAreas.map(name => normalizeText(name));
  const normalizedSheets = sheetNames.map(name => normalizeText(name));
  
  const missing = expectedAreas.filter(expected => 
    !normalizedSheets.includes(normalizeText(expected))
  );
  
  const extra = sheetNames.filter(sheet => 
    !normalizedExpected.includes(normalizeText(sheet))
  );
  
  const suggestions = [
    "Use exact names: 'Administración', 'Producto', 'Capital Humano', 'Comercial'",
    "Check for typos in sheet names",
    "Ensure all 4 required sheets are present",
    "Remove any extra sheets not related to these areas"
  ];
  
  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra,
    suggestions
  };
}