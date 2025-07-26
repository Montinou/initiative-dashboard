import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

// Simulate the processing functions
async function processTableroDataBySheet(rawData, tenantId, sheetName) {
  console.log(`\n🔄 Processing sheet: "${sheetName}"`);
  
  const errors = [];
  const processedData = [];

  if (rawData.length < 2) {
    errors.push(`Sheet "${sheetName}": File must contain at least a header row and one data row`);
    return { data: [], errors };
  }

  // Handle different sheet types based on name and structure
  if (sheetName === 'Resumen por Objetivo' || sheetName.toLowerCase().includes('resumen')) {
    return await processResumenSheet(rawData, tenantId, sheetName);
  } else if (sheetName.startsWith('OKRs ')) {
    return await processOKRSheet(rawData, tenantId, sheetName);
  } else {
    console.log(`  ⚠️  Unknown sheet type, skipping processing`);
    return { data: [], errors: [`Unknown sheet type: ${sheetName}`] };
  }
}

async function processResumenSheet(rawData, tenantId, sheetName) {
  console.log(`  📋 Processing as Resumen sheet`);
  const errors = [];
  const processedData = [];

  // Find the header row for "Resumen por Objetivo" sheet
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('área')) &&
        row.some(cell => cell && cell.toString().toLowerCase().includes('objetivo'))) {
      headerRowIndex = i;
      headers = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find expected headers (Área, Objetivo)`);
    return { data: [], errors };
  }

  console.log(`  ✅ Found headers at row ${headerRowIndex + 1}:`, headers);

  // Map columns for "Resumen por Objetivo"
  const columnMapping = {
    area: -1,
    objetivo: -1,
    progreso: -1,
    obstaculos: -1,
    potenciadores: -1,
    estado: -1
  };

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('área') || headerLower === 'area') {
      columnMapping.area = index;
    } else if (headerLower.includes('objetivo')) {
      columnMapping.objetivo = index;
    } else if (headerLower.includes('%') || headerLower.includes('avance') || headerLower.includes('progreso')) {
      columnMapping.progreso = index;
    } else if (headerLower.includes('obstáculo') || headerLower.includes('lows')) {
      columnMapping.obstaculos = index;
    } else if (headerLower.includes('potenciador') || headerLower.includes('highs')) {
      columnMapping.potenciadores = index;
    } else if (headerLower.includes('estado')) {
      columnMapping.estado = index;
    }
  });

  console.log(`  📊 Column mapping:`, columnMapping);

  // Validate required columns
  if (columnMapping.area === -1 || columnMapping.objetivo === -1 || columnMapping.progreso === -1) {
    errors.push(`Sheet "${sheetName}": Missing required columns (Área, Objetivo, Progreso)`);
    return { data: [], errors };
  }

  // Process data rows
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Skip empty rows
    }

    const processedRow = {
      rowNumber: i + 1,
      area: row[columnMapping.area] ? row[columnMapping.area].toString().trim() : '',
      objetivo: row[columnMapping.objetivo] ? row[columnMapping.objetivo].toString().trim() : '',
      progreso: 0,
      obstaculos: row[columnMapping.obstaculos] ? row[columnMapping.obstaculos].toString().trim() : '',
      potenciadores: row[columnMapping.potenciadores] ? row[columnMapping.potenciadores].toString().trim() : '',
      estado: '🟡',
      sheetSource: sheetName
    };

    // Extract progreso
    const progresoValue = row[columnMapping.progreso];
    if (progresoValue !== undefined && progresoValue !== null) {
      let progress = 0;
      
      if (typeof progresoValue === 'number') {
        progress = progresoValue;
      } else {
        const progressStr = progresoValue.toString().replace('%', '').trim();
        progress = parseFloat(progressStr);
      }
      
      if (!isNaN(progress)) {
        if (progress > 1 && progress <= 100) {
          processedRow.progreso = Math.round(progress);
        } else if (progress <= 1) {
          processedRow.progreso = Math.round(progress * 100);
        }
      }
    }

    // Extract estado
    if (columnMapping.estado !== -1 && row[columnMapping.estado]) {
      processedRow.estado = row[columnMapping.estado].toString().trim();
    }

    if (processedRow.area && processedRow.objetivo) {
      processedData.push(processedRow);
    }
  }

  console.log(`  ✅ Processed ${processedData.length} data rows`);
  return { data: processedData, errors };
}

async function processOKRSheet(rawData, tenantId, sheetName) {
  console.log(`  📈 Processing as OKR sheet`);
  const errors = [];
  const processedData = [];

  // Find the header row for OKR sheets
  let headerRowIndex = -1;
  
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('área')) &&
        row.some(cell => cell && cell.toString().toLowerCase().includes('objetivo'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find expected OKR headers`);
    return { data: [], errors };
  }

  // Look for "Acción Clave" sub-headers
  let actionHeaderRowIndex = -1;
  let actionHeaders = [];
  
  for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('acción'))) {
      actionHeaderRowIndex = i;
      actionHeaders = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (actionHeaderRowIndex === -1) {
    console.log(`  ⚠️  Could not find action headers, skipping OKR processing`);
    return { data: [], errors: [`Could not find action headers in ${sheetName}`] };
  }

  console.log(`  ✅ Found action headers at row ${actionHeaderRowIndex + 1}:`, actionHeaders);

  const areaName = sheetName.replace('OKRs ', '');
  console.log(`  📝 Processing OKRs for area: ${areaName}`);

  // For now, just return basic structure - actual processing would continue here
  console.log(`  ✅ OKR sheet structure identified (processing would continue...)`);
  
  return { data: [], errors: [] };
}

try {
  const filePath = '/mnt/e/Projects/Mariana projectos/Mariana/public/Tablero_de_Gestión_SIGA_FUNCIONAL.xlsx';
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  console.log('🚀 TESTING MULTI-SHEET PROCESSING');
  console.log('='.repeat(50));
  console.log(`Total sheets: ${workbook.SheetNames.length}`);
  
  const allSheetsData = [];
  const allErrors = [];
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Skip empty sheets
    if (!rawData || rawData.length < 2) {
      console.log(`\n⏭️  Skipping empty sheet: "${sheetName}"`);
      continue;
    }
    
    // Process each sheet
    const processedSheet = await processTableroDataBySheet(rawData, 'fema-electricidad', sheetName);
    
    if (processedSheet.data.length > 0) {
      allSheetsData.push({
        sheetName,
        data: processedSheet.data,
        recordCount: processedSheet.data.length
      });
    }
    
    if (processedSheet.errors.length > 0) {
      allErrors.push(...processedSheet.errors.map(error => `[${sheetName}] ${error}`));
    }
  }
  
  console.log('\n📊 PROCESSING SUMMARY');
  console.log('='.repeat(30));
  console.log(`Sheets processed: ${allSheetsData.length}`);
  console.log(`Total records: ${allSheetsData.reduce((sum, sheet) => sum + sheet.recordCount, 0)}`);
  console.log(`Total errors: ${allErrors.length}`);
  
  if (allSheetsData.length > 0) {
    console.log('\n📋 Sheet Details:');
    allSheetsData.forEach(sheet => {
      console.log(`  • ${sheet.sheetName}: ${sheet.recordCount} records`);
      if (sheet.data.length > 0) {
        console.log(`    Sample record:`, sheet.data[0]);
      }
    });
  }
  
  if (allErrors.length > 0) {
    console.log('\n⚠️  Errors:');
    allErrors.slice(0, 5).forEach(error => console.log(`  • ${error}`));
    if (allErrors.length > 5) {
      console.log(`  ... and ${allErrors.length - 5} more errors`);
    }
  }
  
} catch (error) {
  console.error('❌ Error testing multi-sheet processing:', error.message);
}