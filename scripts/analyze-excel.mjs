import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

try {
  // Read the Excel file
  const filePath = '/mnt/e/Projects/Mariana projectos/Mariana/public/Tablero_de_Gestión_SIGA_FUNCIONAL.xlsx';
  const fileBuffer = readFileSync(filePath);
  
  // Parse the workbook
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  console.log('📊 EXCEL FILE ANALYSIS');
  console.log('='.repeat(50));
  console.log(`File: ${filePath.split('/').pop()}`);
  console.log(`Total Sheets: ${workbook.SheetNames.length}`);
  console.log('');
  
  // Analyze each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`Sheet ${index + 1}: "${sheetName}"`);
    console.log('-'.repeat(30));
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range of the sheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    console.log(`Range: ${worksheet['!ref'] || 'Empty'}`);
    console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
    
    // Convert to JSON to analyze structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 0) {
      console.log(`Data rows: ${jsonData.length}`);
      
      // Show headers (first row)
      if (jsonData[0]) {
        console.log('Headers:', jsonData[0].filter(h => h && h.toString().trim()));
      }
      
      // Show first few data rows
      console.log('\nSample data (first 3 rows):');
      jsonData.slice(0, 3).forEach((row, i) => {
        if (row && row.some(cell => cell)) {
          console.log(`Row ${i + 1}:`, row.filter(cell => cell && cell.toString().trim()));
        }
      });
    } else {
      console.log('No data found in this sheet');
    }
    
    console.log('');
  });
  
  // Generate processing strategy
  console.log('🔧 PROCESSING STRATEGY');
  console.log('='.repeat(50));
  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 1) {
      console.log(`Sheet "${sheetName}":`);
      
      // Analyze potential data structure
      const headers = jsonData[0]?.filter(h => h && h.toString().trim()) || [];
      
      // Look for common patterns
      const hasArea = headers.some(h => 
        h.toString().toLowerCase().includes('área') || 
        h.toString().toLowerCase().includes('area') ||
        h.toString().toLowerCase().includes('división')
      );
      
      const hasObjetivo = headers.some(h => 
        h.toString().toLowerCase().includes('objetivo') ||
        h.toString().toLowerCase().includes('meta') ||
        h.toString().toLowerCase().includes('initiative')
      );
      
      const hasProgreso = headers.some(h => 
        h.toString().toLowerCase().includes('progreso') ||
        h.toString().toLowerCase().includes('avance') ||
        h.toString().toLowerCase().includes('%') ||
        h.toString().toLowerCase().includes('progress')
      );
      
      if (hasArea && hasObjetivo && hasProgreso) {
        console.log('  ✅ Compatible with initiative processing');
        console.log(`  📝 Headers: ${headers.join(', ')}`);
      } else {
        console.log('  ⚠️  May need custom processing logic');
        console.log(`  📝 Headers: ${headers.join(', ')}`);
      }
    }
  });
  
} catch (error) {
  console.error('Error analyzing Excel file:', error.message);
}