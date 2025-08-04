const XLSX = require('xlsx');
const path = require('path');

function debugExcelDetailed() {
  const filePath = path.join(__dirname, 'public', 'OKRFull.xlsx');
  const workbook = XLSX.readFile(filePath);
  
  // Analizar solo una pestaña en detalle
  const sheetName = 'Capital Humano'; // Esta parece tener más datos
  console.log(`🔍 Análisis detallado de: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`📊 Total de filas: ${rawData.length}`);
  
  // Mostrar estructura detallada de las primeras 20 filas
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    console.log(`\nFila ${i + 1}:`);
    
    if (!row || row.length === 0) {
      console.log('  [VACÍA]');
      continue;
    }
    
    // Mostrar cada columna con su índice
    row.forEach((cell, colIndex) => {
      if (cell !== undefined && cell !== null && cell !== '') {
        console.log(`  Col ${colIndex}: "${cell}"`);
      }
    });
    
    // Si es una fila con datos interesantes, marcarla
    const hasInterestingData = row.some(cell => 
      cell && 
      typeof cell === 'number' && 
      cell > 0 && 
      cell <= 1
    );
    
    if (hasInterestingData) {
      console.log('  *** FILA CON DATOS NUMÉRICOS ***');
    }
  }
  
  // Buscar patrones de progreso
  console.log('\n🎯 Buscando filas con valores de progreso (0-1):');
  for (let i = 0; i < Math.min(50, rawData.length); i++) {
    const row = rawData[i];
    if (row) {
      row.forEach((cell, colIndex) => {
        if (typeof cell === 'number' && cell > 0 && cell <= 1) {
          console.log(`  Fila ${i + 1}, Col ${colIndex}: ${cell} (${(cell * 100).toFixed(1)}%)`);
        }
      });
    }
  }
}

debugExcelDetailed();