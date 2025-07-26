import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

try {
  const filePath = '/mnt/e/Projects/Mariana projectos/Mariana/public/Tablero_de_Gestión_SIGA_FUNCIONAL.xlsx';
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  // Focus on the "Resumen por Objetivo" sheet
  const summarySheet = workbook.Sheets['Resumen por Objetivo'];
  const jsonData = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
  
  console.log('📋 DETAILED ANALYSIS: "Resumen por Objetivo" Sheet');
  console.log('='.repeat(60));
  
  // Find the actual headers row (usually row 2 based on the sample)
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (row && row.includes('Área') && row.includes('Objetivo Clave')) {
      headerRowIndex = i;
      headers = row.filter(h => h && h.toString().trim());
      break;
    }
  }
  
  if (headerRowIndex !== -1) {
    console.log(`Headers found at row ${headerRowIndex + 1}:`);
    console.log(headers);
    console.log('');
    
    // Extract data rows
    const dataRows = jsonData
      .slice(headerRowIndex + 1)
      .filter(row => row && row.length > 0 && row[0] && row[0].toString().trim())
      .slice(0, 20); // First 20 data rows
    
    console.log(`Found ${dataRows.length} data rows. Sample data:`);
    console.log('-'.repeat(40));
    
    dataRows.slice(0, 10).forEach((row, index) => {
      console.log(`Row ${index + 1}:`);
      headers.forEach((header, i) => {
        if (row[i] !== undefined && row[i] !== null) {
          console.log(`  ${header}: ${row[i]}`);
        }
      });
      console.log('');
    });
    
    // Analyze data types
    console.log('📊 DATA TYPE ANALYSIS:');
    console.log('-'.repeat(30));
    
    const sampleData = dataRows.slice(0, 5);
    headers.forEach((header, index) => {
      const values = sampleData.map(row => row[index]).filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        console.log(`${header}:`);
        console.log(`  Sample values: ${values.slice(0, 3).join(', ')}`);
        console.log(`  Type: ${typeof values[0]}`);
      }
    });
    
  } else {
    console.log('❌ Could not find header row with expected structure');
    console.log('First 10 rows:');
    jsonData.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row.filter(cell => cell));
    });
  }
  
  // Analyze all sheets for potential processing
  console.log('\n🔍 ALL SHEETS ANALYSIS:');
  console.log('='.repeat(50));
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`\n📄 Sheet: "${sheetName}"`);
    
    // Look for useful data structure
    let foundDataStart = false;
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i];
      if (row && row.length > 3) {
        const hasArea = row.some(cell => cell && cell.toString().toLowerCase().includes('área'));
        const hasObjective = row.some(cell => cell && cell.toString().toLowerCase().includes('objetivo'));
        const hasProgress = row.some(cell => cell && (cell.toString().includes('%') || cell.toString().toLowerCase().includes('avance')));
        
        if (hasArea || hasObjective || hasProgress) {
          console.log(`  Headers at row ${i + 1}:`, row.filter(h => h));
          
          // Show sample data
          if (i + 1 < sheetData.length) {
            const sampleRow = sheetData[i + 1];
            if (sampleRow && sampleRow.some(cell => cell)) {
              console.log(`  Sample data:`, sampleRow.filter(cell => cell));
            }
          }
          foundDataStart = true;
          break;
        }
      }
    }
    
    if (!foundDataStart) {
      console.log('  ⚠️  No clear data structure found');
    }
  });
    
} catch (error) {
  console.error('Error analyzing Excel file:', error.message);
}