const XLSX = require('xlsx');
const path = require('path');

function debugExcelFile() {
  const filePath = path.join(__dirname, 'public', 'OKRFull.xlsx');
  console.log('🔍 Analizando estructura del archivo:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n📋 === PESTAÑA: ${sheetName} ===`);
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`   Filas totales: ${rawData.length}`);
    
    // Mostrar las primeras 10 filas
    console.log('\n   🔍 Primeras 10 filas:');
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.length > 0) {
        console.log(`   ${i + 1}: [${row.join(' | ')}]`);
      } else {
        console.log(`   ${i + 1}: [vacía]`);
      }
    }
    
    // Buscar filas con contenido relevante
    console.log('\n   🎯 Buscando filas con "OBJETIVO":');
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.some(cell => 
        cell && cell.toString().toLowerCase().includes('objetivo')
      )) {
        console.log(`   Fila ${i + 1} (OBJETIVO): [${row.join(' | ')}]`);
      }
    }
    
    // Buscar filas con datos que no sean encabezados
    console.log('\n   📊 Filas con datos (no encabezados):');
    let dataRowsFound = 0;
    for (let i = 0; i < Math.min(30, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.length > 0) {
        // Verificar si es una fila de datos (no encabezados)
        const hasDataContent = row.some(cell => 
          cell && 
          !cell.toString().toLowerCase().includes('objetivo') &&
          !cell.toString().toLowerCase().includes('área') &&
          !cell.toString().toLowerCase().includes('período') &&
          cell.toString().trim().length > 3
        );
        
        if (hasDataContent && dataRowsFound < 5) {
          console.log(`   Fila ${i + 1} (DATOS): [${row.join(' | ')}]`);
          dataRowsFound++;
        }
      }
    }
    
    if (dataRowsFound === 0) {
      console.log('   ⚠️  No se encontraron filas de datos claras');
    }
  });
}

debugExcelFile();