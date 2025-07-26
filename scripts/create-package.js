const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createPackage() {
  const packageDir = path.join(__dirname, '..', 'mvp-role-configuration-package');
  const outputPath = path.join(__dirname, '..', 'mvp-role-configuration-package.zip');
  
  // Create write stream for the ZIP file
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Handle stream events
  output.on('close', () => {
    console.log('✅ Package created successfully!');
    console.log(`📦 Total size: ${archive.pointer()} bytes`);
    console.log(`📁 Location: ${outputPath}`);
    console.log('');
    console.log('📋 Package Contents:');
    console.log('  • roles/ - Role configuration JSON files');
    console.log('  • charts/ - Chart component configurations');
    console.log('  • templates/ - Excel template with sample data');
    console.log('  • documentation/ - Implementation guides and instructions');
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Add files to archive
  console.log('📦 Creating MVP Role Configuration Package...');
  
  // Add the entire package directory
  archive.directory(packageDir, false);
  
  // Add version info file
  const versionInfo = {
    name: "MVP Role Configuration Package",
    version: "1.0.0",
    created: new Date().toISOString().split('T')[0],
    description: "Complete role-based access control system with standardized visualizations and downloadable XLSX template",
    components: {
      roles: "CEO, Admin, Analyst, Manager role definitions with permissions",
      charts: "Progress distribution, status tracking, area comparisons, and objective tracking visualizations",
      template: "Standardized Excel template for organizational management tracking",
      documentation: "Complete implementation guides and usage instructions"
    },
    technologies: {
      frontend: "React, TypeScript, Tailwind CSS, Recharts",
      backend: "Next.js, Supabase",
      excel: "SheetJS (xlsx) library",
      packaging: "Node.js archiver"
    },
    integration: {
      glassmorphism: "Consistent with existing design system",
      responsive: "Mobile-first responsive design",
      accessibility: "ARIA compliant components",
      i18n: "Spanish language support"
    }
  };
  
  archive.append(JSON.stringify(versionInfo, null, 2), { name: 'package-info.json' });
  
  // Add README for the package
  const packageReadme = `# MVP Role Configuration Package

## Contents

This package contains a complete implementation of role-based access control with dashboard visualizations and standardized Excel templates.

### Included Files

- **roles/**: JSON configuration files for 4 role types (CEO, Admin, Analyst, Manager)
- **charts/**: Component configurations for strategic and area-specific charts  
- **templates/**: Excel template with sample data and validation
- **documentation/**: Complete implementation and usage guides

### Quick Start

1. Extract the package to your project directory
2. Follow the role-implementation-guide.md for RBAC setup
3. Use chart-integration-guide.md for dashboard components
4. Reference template-usage-instructions.md for Excel template usage

### Requirements

- React 18+
- TypeScript 4.5+
- Tailwind CSS 3.0+
- Recharts 2.0+
- SheetJS (xlsx) library

### Support

Refer to the documentation/ folder for detailed implementation guides and troubleshooting information.

Generated on: ${new Date().toLocaleDateString()}
Version: 1.0.0
`;

  archive.append(packageReadme, { name: 'README.md' });
  
  // Finalize the archive
  await archive.finalize();
}

// Create the package
createPackage().catch(console.error);