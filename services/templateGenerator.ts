import { parse } from 'json2csv';
import * as XLSX from 'xlsx';

interface TemplateColumn {
  field: string;
  header: string;
  description: string;
  required: boolean;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'json';
  enum?: string[];
  example: string | number | boolean;
}

interface TemplateDefinition {
  entity: string;
  columns: TemplateColumn[];
  exampleRows: any[];
}

// Template definitions for each entity type
const templateDefinitions: Record<string, TemplateDefinition> = {
  objectives: {
    entity: 'objectives',
    columns: [
      {
        field: 'title',
        header: 'Title*',
        description: 'Objective title (required)',
        required: true,
        type: 'text',
        example: 'Increase Market Share'
      },
      {
        field: 'description',
        header: 'Description',
        description: 'Detailed description of the objective',
        required: false,
        type: 'text',
        example: 'Expand into new geographic markets and customer segments'
      },
      {
        field: 'start_date',
        header: 'Start Date',
        description: 'Start date (YYYY-MM-DD)',
        required: false,
        type: 'date',
        example: '2025-01-01'
      },
      {
        field: 'end_date',
        header: 'End Date',
        description: 'End date (YYYY-MM-DD)',
        required: false,
        type: 'date',
        example: '2025-12-31'
      },
      {
        field: 'target_date',
        header: 'Target Date',
        description: 'Target completion date (YYYY-MM-DD)',
        required: false,
        type: 'date',
        example: '2025-06-30'
      },
      {
        field: 'priority',
        header: 'Priority',
        description: 'Priority level (high/medium/low)',
        required: false,
        type: 'enum',
        enum: ['high', 'medium', 'low'],
        example: 'high'
      },
      {
        field: 'status',
        header: 'Status',
        description: 'Current status',
        required: false,
        type: 'enum',
        enum: ['planning', 'in_progress', 'completed', 'overdue'],
        example: 'planning'
      },
      {
        field: 'progress',
        header: 'Progress',
        description: 'Progress percentage (0-100)',
        required: false,
        type: 'number',
        example: 0
      },
      {
        field: 'metrics',
        header: 'Metrics',
        description: 'JSON array of metrics',
        required: false,
        type: 'json',
        example: '[{"name":"Revenue Growth","target":"20%","current":"5%"}]'
      }
    ],
    exampleRows: [
      {
        title: 'Increase Market Share',
        description: 'Expand into new geographic markets and customer segments',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        target_date: '2025-06-30',
        priority: 'high',
        status: 'planning',
        progress: 0,
        metrics: '[{"name":"Market Share","target":"25%","current":"18%"}]'
      },
      {
        title: 'Improve Customer Satisfaction',
        description: 'Enhance product quality and customer service',
        start_date: '2025-02-01',
        end_date: '2025-09-30',
        target_date: '2025-07-31',
        priority: 'medium',
        status: 'in_progress',
        progress: 35,
        metrics: '[{"name":"NPS Score","target":"70","current":"55"}]'
      },
      {
        title: 'Launch New Product Line',
        description: 'Develop and launch innovative products',
        start_date: '2025-03-01',
        end_date: '2025-11-30',
        target_date: '2025-10-31',
        priority: 'high',
        status: 'planning',
        progress: 10,
        metrics: '[{"name":"Products Launched","target":"5","current":"0"}]'
      }
    ]
  },

  initiatives: {
    entity: 'initiatives',
    columns: [
      {
        field: 'title',
        header: 'Title*',
        description: 'Initiative title (required)',
        required: true,
        type: 'text',
        example: 'Regional Expansion Campaign'
      },
      {
        field: 'description',
        header: 'Description',
        description: 'Detailed description',
        required: false,
        type: 'text',
        example: 'Marketing and sales campaign for new regions'
      },
      {
        field: 'objective_title',
        header: 'Objective Title*',
        description: 'Title of the linked objective (required)',
        required: true,
        type: 'text',
        example: 'Increase Market Share'
      },
      {
        field: 'start_date',
        header: 'Start Date',
        description: 'Start date (YYYY-MM-DD)',
        required: false,
        type: 'date',
        example: '2025-01-15'
      },
      {
        field: 'due_date',
        header: 'Due Date',
        description: 'Due date (YYYY-MM-DD)',
        required: false,
        type: 'date',
        example: '2025-04-30'
      },
      {
        field: 'status',
        header: 'Status',
        description: 'Current status',
        required: false,
        type: 'enum',
        enum: ['planning', 'in_progress', 'completed', 'on_hold'],
        example: 'planning'
      },
      {
        field: 'progress',
        header: 'Progress',
        description: 'Progress percentage (0-100)',
        required: false,
        type: 'number',
        example: 0
      }
    ],
    exampleRows: [
      {
        title: 'Regional Expansion Campaign',
        description: 'Marketing and sales campaign for new regions',
        objective_title: 'Increase Market Share',
        start_date: '2025-01-15',
        due_date: '2025-04-30',
        status: 'planning',
        progress: 0
      },
      {
        title: 'Customer Support Training',
        description: 'Train support team on new procedures',
        objective_title: 'Improve Customer Satisfaction',
        start_date: '2025-02-01',
        due_date: '2025-03-15',
        status: 'in_progress',
        progress: 45
      },
      {
        title: 'Product Design Sprint',
        description: 'Design sprint for new product features',
        objective_title: 'Launch New Product Line',
        start_date: '2025-03-01',
        due_date: '2025-05-31',
        status: 'planning',
        progress: 15
      }
    ]
  },

  activities: {
    entity: 'activities',
    columns: [
      {
        field: 'title',
        header: 'Title*',
        description: 'Activity title (required)',
        required: true,
        type: 'text',
        example: 'Market Research'
      },
      {
        field: 'description',
        header: 'Description',
        description: 'Activity description',
        required: false,
        type: 'text',
        example: 'Conduct market analysis for target regions'
      },
      {
        field: 'initiative_title',
        header: 'Initiative Title*',
        description: 'Title of the linked initiative (required)',
        required: true,
        type: 'text',
        example: 'Regional Expansion Campaign'
      },
      {
        field: 'assigned_to_email',
        header: 'Assigned To Email',
        description: 'Email of the assigned user',
        required: false,
        type: 'text',
        example: 'john.doe@example.com'
      },
      {
        field: 'is_completed',
        header: 'Is Completed',
        description: 'Completion status (true/false)',
        required: false,
        type: 'boolean',
        example: 'false'
      }
    ],
    exampleRows: [
      {
        title: 'Market Research',
        description: 'Conduct market analysis for target regions',
        initiative_title: 'Regional Expansion Campaign',
        assigned_to_email: 'john.doe@example.com',
        is_completed: 'false'
      },
      {
        title: 'Create Marketing Materials',
        description: 'Design brochures and digital content',
        initiative_title: 'Regional Expansion Campaign',
        assigned_to_email: 'jane.smith@example.com',
        is_completed: 'false'
      },
      {
        title: 'Schedule Training Sessions',
        description: 'Organize training calendar for Q1',
        initiative_title: 'Customer Support Training',
        assigned_to_email: 'mike.wilson@example.com',
        is_completed: 'true'
      }
    ]
  },

  users: {
    entity: 'users',
    columns: [
      {
        field: 'email',
        header: 'Email*',
        description: 'User email address (required)',
        required: true,
        type: 'text',
        example: 'john.doe@example.com'
      },
      {
        field: 'full_name',
        header: 'Full Name*',
        description: 'User full name (required)',
        required: true,
        type: 'text',
        example: 'John Doe'
      },
      {
        field: 'role',
        header: 'Role*',
        description: 'User role (CEO/Admin/Manager) (required)',
        required: true,
        type: 'enum',
        enum: ['CEO', 'Admin', 'Manager'],
        example: 'Manager'
      },
      {
        field: 'area_name',
        header: 'Area Name',
        description: 'Area name for Managers',
        required: false,
        type: 'text',
        example: 'Sales'
      },
      {
        field: 'phone',
        header: 'Phone',
        description: 'Phone number',
        required: false,
        type: 'text',
        example: '+1-555-0123'
      },
      {
        field: 'is_active',
        header: 'Is Active',
        description: 'Account status (true/false)',
        required: false,
        type: 'boolean',
        example: 'true'
      }
    ],
    exampleRows: [
      {
        email: 'john.doe@example.com',
        full_name: 'John Doe',
        role: 'CEO',
        area_name: '',
        phone: '+1-555-0100',
        is_active: 'true'
      },
      {
        email: 'jane.smith@example.com',
        full_name: 'Jane Smith',
        role: 'Manager',
        area_name: 'Sales',
        phone: '+1-555-0101',
        is_active: 'true'
      },
      {
        email: 'mike.wilson@example.com',
        full_name: 'Mike Wilson',
        role: 'Manager',
        area_name: 'Engineering',
        phone: '+1-555-0102',
        is_active: 'true'
      }
    ]
  },

  areas: {
    entity: 'areas',
    columns: [
      {
        field: 'name',
        header: 'Name*',
        description: 'Area name (required)',
        required: true,
        type: 'text',
        example: 'Sales'
      },
      {
        field: 'description',
        header: 'Description',
        description: 'Area description',
        required: false,
        type: 'text',
        example: 'Sales and Business Development'
      },
      {
        field: 'manager_email',
        header: 'Manager Email',
        description: 'Email of the area manager',
        required: false,
        type: 'text',
        example: 'jane.smith@example.com'
      },
      {
        field: 'is_active',
        header: 'Is Active',
        description: 'Area status (true/false)',
        required: false,
        type: 'boolean',
        example: 'true'
      }
    ],
    exampleRows: [
      {
        name: 'Sales',
        description: 'Sales and Business Development',
        manager_email: 'jane.smith@example.com',
        is_active: 'true'
      },
      {
        name: 'Engineering',
        description: 'Product Development and Engineering',
        manager_email: 'mike.wilson@example.com',
        is_active: 'true'
      },
      {
        name: 'Marketing',
        description: 'Marketing and Brand Management',
        manager_email: 'sarah.jones@example.com',
        is_active: 'true'
      }
    ]
  }
};

export class TemplateGenerator {
  /**
   * Generate CSV template for a specific entity
   */
  static generateCSVTemplate(entityType: string): string {
    const definition = templateDefinitions[entityType];
    if (!definition) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const fields = definition.columns.map(col => col.field);
    const opts = {
      fields,
      header: true,
      transforms: [
        (item: any) => {
          const transformed: any = {};
          definition.columns.forEach(col => {
            transformed[col.field] = col.header;
          });
          return transformed;
        }
      ]
    };

    // Create header row with descriptions
    const headerRow = parse([{}], opts);

    // Add example rows
    const exampleRows = parse(definition.exampleRows, { fields, header: false });

    return `${headerRow}\n${exampleRows}`;
  }

  /**
   * Generate Excel template with multiple sheets
   */
  static generateExcelTemplate(): Buffer {
    const workbook = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ['OKR Import Template Instructions'],
      [''],
      ['This Excel file contains templates for importing OKR data.'],
      ['Each sheet represents a different entity type that can be imported.'],
      [''],
      ['Import Order:'],
      ['1. Areas - Define organizational areas first'],
      ['2. Users - Create user profiles and assign to areas'],
      ['3. Objectives - Define strategic objectives'],
      ['4. Initiatives - Create initiatives linked to objectives'],
      ['5. Activities - Add activities to initiatives'],
      [''],
      ['Guidelines:'],
      ['- Required fields are marked with * in the column header'],
      ['- Date fields must be in YYYY-MM-DD format'],
      ['- Progress fields must be between 0 and 100'],
      ['- Boolean fields must be "true" or "false"'],
      ['- JSON fields must be valid JSON strings'],
      ['- Do not modify the header row'],
      ['- Remove example rows before importing'],
      [''],
      ['Entity Relationships:'],
      ['- Initiatives must reference existing Objectives by title'],
      ['- Activities must reference existing Initiatives by title'],
      ['- Users with Manager role should be assigned to Areas'],
      ['- Areas can have a manager assigned by email'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    
    // Set column widths for instructions
    instructionsSheet['!cols'] = [{ wch: 80 }];
    
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Add sheets for each entity type
    Object.entries(templateDefinitions).forEach(([entityType, definition]) => {
      const sheetData: any[][] = [];
      
      // Add header row with column names
      sheetData.push(definition.columns.map(col => col.header));
      
      // Add description row (as a comment-like row)
      sheetData.push(definition.columns.map(col => col.description));
      
      // Add example rows
      definition.exampleRows.forEach(row => {
        sheetData.push(definition.columns.map(col => row[col.field] || ''));
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      sheet['!cols'] = definition.columns.map(col => ({ wch: 20 }));
      
      // Add data validation for enum fields (Excel feature)
      definition.columns.forEach((col, index) => {
        if (col.type === 'enum' && col.enum) {
          // Note: XLSX doesn't support data validation directly,
          // but we can add it as a comment for documentation
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
          if (!sheet[cellAddress].c) sheet[cellAddress].c = [];
          sheet[cellAddress].c.push({
            t: `Valid values: ${col.enum.join(', ')}`,
            a: 'OKR Import System'
          });
        }
      });

      // Capitalize entity type for sheet name
      const sheetName = entityType.charAt(0).toUpperCase() + entityType.slice(1);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    // Generate buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Get example data as JSON
   */
  static getExampleData(entityType?: string): any {
    if (entityType) {
      const definition = templateDefinitions[entityType];
      if (!definition) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      return {
        entity: definition.entity,
        columns: definition.columns,
        examples: definition.exampleRows
      };
    }

    // Return all examples
    const allExamples: any = {};
    Object.entries(templateDefinitions).forEach(([key, definition]) => {
      allExamples[key] = {
        entity: definition.entity,
        columns: definition.columns,
        examples: definition.exampleRows
      };
    });
    return allExamples;
  }

  /**
   * Validate if a CSV/Excel structure matches expected template
   */
  static validateTemplateStructure(
    headers: string[],
    entityType: string
  ): { valid: boolean; errors: string[] } {
    const definition = templateDefinitions[entityType];
    if (!definition) {
      return { valid: false, errors: [`Invalid entity type: ${entityType}`] };
    }

    const errors: string[] = [];
    const requiredFields = definition.columns
      .filter(col => col.required)
      .map(col => col.header);

    // Check for required fields
    requiredFields.forEach(field => {
      if (!headers.includes(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Check for unknown fields (warning only)
    const validFields = definition.columns.map(col => col.header);
    headers.forEach(header => {
      if (!validFields.includes(header)) {
        errors.push(`Warning: Unknown field: ${header}`);
      }
    });

    return {
      valid: errors.filter(e => !e.startsWith('Warning')).length === 0,
      errors
    };
  }

  /**
   * Get template metadata
   */
  static getTemplateMetadata(entityType: string) {
    const definition = templateDefinitions[entityType];
    if (!definition) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    return {
      entity: definition.entity,
      columns: definition.columns.map(col => ({
        field: col.field,
        header: col.header,
        description: col.description,
        required: col.required,
        type: col.type,
        enum: col.enum
      })),
      exampleCount: definition.exampleRows.length
    };
  }

  /**
   * Get all available entity types
   */
  static getAvailableEntityTypes(): string[] {
    return Object.keys(templateDefinitions);
  }
}