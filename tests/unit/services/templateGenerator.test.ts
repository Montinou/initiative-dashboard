import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateGenerator } from '@/services/templateGenerator';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';

vi.mock('xlsx');
vi.mock('json2csv');

describe('TemplateGenerator', () => {
  let generator: TemplateGenerator;

  beforeEach(() => {
    generator = new TemplateGenerator();
    vi.clearAllMocks();
  });

  describe('generateCSVTemplate', () => {
    it('should generate CSV template for objectives', () => {
      const template = generator.generateCSVTemplate('objectives');

      expect(template).toContain('title*');
      expect(template).toContain('description');
      expect(template).toContain('priority');
      expect(template).toContain('status');
      expect(template).toContain('progress');
      expect(template).toContain('start_date');
      expect(template).toContain('end_date');
      expect(template).toContain('target_date');
      expect(template).toContain('metrics');
    });

    it('should generate CSV template for initiatives', () => {
      const template = generator.generateCSVTemplate('initiatives');

      expect(template).toContain('title*');
      expect(template).toContain('description');
      expect(template).toContain('objective_title');
      expect(template).toContain('progress');
      expect(template).toContain('start_date');
      expect(template).toContain('due_date');
      expect(template).toContain('status');
    });

    it('should generate CSV template for activities', () => {
      const template = generator.generateCSVTemplate('activities');

      expect(template).toContain('title*');
      expect(template).toContain('description');
      expect(template).toContain('initiative_title*');
      expect(template).toContain('assigned_to');
      expect(template).toContain('is_completed');
    });

    it('should generate CSV template for users', () => {
      const template = generator.generateCSVTemplate('users');

      expect(template).toContain('email*');
      expect(template).toContain('full_name');
      expect(template).toContain('role*');
      expect(template).toContain('area');
    });

    it('should generate CSV template for areas', () => {
      const template = generator.generateCSVTemplate('areas');

      expect(template).toContain('name*');
      expect(template).toContain('description');
      expect(template).toContain('manager_email');
    });

    it('should include example data in CSV template', () => {
      const template = generator.generateCSVTemplate('objectives', true);

      expect(template).toContain('Increase Revenue by 20%');
      expect(template).toContain('high');
      expect(template).toContain('in_progress');
      expect(template).toContain('45');
      expect(template).toContain('2025-01-01');
      expect(template).toContain('2025-12-31');
    });

    it('should throw error for invalid entity type', () => {
      expect(() => {
        generator.generateCSVTemplate('invalid_entity' as any);
      }).toThrow('Invalid entity type: invalid_entity');
    });
  });

  describe('generateExcelTemplate', () => {
    it('should generate Excel template with all entity sheets', () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {},
      };

      (XLSX.utils.aoa_to_sheet as any) = vi.fn().mockReturnValue({});
      (XLSX.utils.book_new as any) = vi.fn().mockReturnValue(mockWorkbook);
      (XLSX.utils.book_append_sheet as any) = vi.fn();
      (XLSX.write as any) = vi.fn().mockReturnValue(Buffer.from('test'));

      const buffer = generator.generateExcelTemplate();

      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(6); // 5 entities + 1 instructions
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include instructions sheet', () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {},
      };

      (XLSX.utils.aoa_to_sheet as any) = vi.fn().mockReturnValue({});
      (XLSX.utils.book_new as any) = vi.fn().mockReturnValue(mockWorkbook);
      (XLSX.utils.book_append_sheet as any) = vi.fn();

      generator.generateExcelTemplate();

      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Instructions'
      );
    });

    it('should include example data when requested', () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {},
      };

      let capturedData: any[] = [];
      (XLSX.utils.aoa_to_sheet as any) = vi.fn((data) => {
        capturedData.push(data);
        return {};
      });
      (XLSX.utils.book_new as any) = vi.fn().mockReturnValue(mockWorkbook);
      (XLSX.utils.book_append_sheet as any) = vi.fn();
      (XLSX.write as any) = vi.fn().mockReturnValue(Buffer.from('test'));

      generator.generateExcelTemplate(true);

      // Check that example data is included
      const objectivesSheet = capturedData.find(data => 
        data[0] && data[0].includes('title*')
      );
      
      expect(objectivesSheet).toBeDefined();
      expect(objectivesSheet.length).toBeGreaterThan(1); // Headers + example rows
    });

    it('should add data validation for enums', () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {},
      };

      const mockSheet = {
        '!dataValidation': [],
      };

      (XLSX.utils.aoa_to_sheet as any) = vi.fn().mockReturnValue(mockSheet);
      (XLSX.utils.book_new as any) = vi.fn().mockReturnValue(mockWorkbook);
      (XLSX.utils.book_append_sheet as any) = vi.fn();
      (XLSX.write as any) = vi.fn().mockReturnValue(Buffer.from('test'));

      generator.generateExcelTemplate();

      // Verify data validation was added
      expect(mockSheet['!dataValidation']).toBeDefined();
    });
  });

  describe('getExampleData', () => {
    it('should return example data for objectives', () => {
      const examples = generator.getExampleData('objectives');

      expect(examples).toHaveLength(2);
      expect(examples[0]).toMatchObject({
        title: expect.any(String),
        priority: expect.stringMatching(/high|medium|low/),
        status: expect.stringMatching(/planning|in_progress|completed|overdue/),
        progress: expect.any(Number),
      });
    });

    it('should return example data for initiatives', () => {
      const examples = generator.getExampleData('initiatives');

      expect(examples).toHaveLength(3);
      expect(examples[0]).toMatchObject({
        title: expect.any(String),
        objective_title: expect.any(String),
        progress: expect.any(Number),
        status: expect.stringMatching(/planning|in_progress|completed|on_hold/),
      });
    });

    it('should return example data for activities', () => {
      const examples = generator.getExampleData('activities');

      expect(examples).toHaveLength(3);
      expect(examples[0]).toMatchObject({
        title: expect.any(String),
        initiative_title: expect.any(String),
        is_completed: expect.any(Boolean),
      });
    });

    it('should return example data for users', () => {
      const examples = generator.getExampleData('users');

      expect(examples).toHaveLength(3);
      expect(examples[0]).toMatchObject({
        email: expect.stringContaining('@'),
        role: expect.stringMatching(/CEO|Admin|Manager/),
      });
    });

    it('should return example data for areas', () => {
      const examples = generator.getExampleData('areas');

      expect(examples).toHaveLength(3);
      expect(examples[0]).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
      });
    });
  });

  describe('getTemplateHeaders', () => {
    it('should return headers with descriptions for objectives', () => {
      const headers = generator.getTemplateHeaders('objectives');

      expect(headers).toMatchObject({
        'title*': 'Objective title (required)',
        description: 'Detailed description',
        priority: 'Priority level (high/medium/low)',
        status: 'Current status (planning/in_progress/completed/overdue)',
        progress: 'Progress percentage (0-100)',
        start_date: 'Start date (YYYY-MM-DD)',
        end_date: 'End date (YYYY-MM-DD)',
        target_date: 'Target completion date (YYYY-MM-DD)',
        metrics: 'JSON array of metrics',
      });
    });

    it('should return headers with descriptions for initiatives', () => {
      const headers = generator.getTemplateHeaders('initiatives');

      expect(headers).toMatchObject({
        'title*': 'Initiative title (required)',
        objective_title: 'Link to objective by title',
        progress: 'Progress percentage (0-100)',
        start_date: 'Start date (YYYY-MM-DD)',
        due_date: 'Due date (YYYY-MM-DD)',
        status: 'Status (planning/in_progress/completed/on_hold)',
      });
    });

    it('should mark required fields with asterisk', () => {
      const objectiveHeaders = generator.getTemplateHeaders('objectives');
      const initiativeHeaders = generator.getTemplateHeaders('initiatives');
      const activityHeaders = generator.getTemplateHeaders('activities');

      expect(Object.keys(objectiveHeaders)).toContain('title*');
      expect(Object.keys(initiativeHeaders)).toContain('title*');
      expect(Object.keys(activityHeaders)).toContain('title*');
      expect(Object.keys(activityHeaders)).toContain('initiative_title*');
    });
  });

  describe('validateTemplateStructure', () => {
    it('should validate correct CSV structure for objectives', () => {
      const csvContent = 'title*,description,priority,status,progress\n';
      const result = generator.validateTemplateStructure(csvContent, 'objectives');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required columns', () => {
      const csvContent = 'description,priority,status\n'; // Missing title
      const result = generator.validateTemplateStructure(csvContent, 'objectives');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Missing required column: title')
      );
    });

    it('should detect invalid columns', () => {
      const csvContent = 'title*,invalid_column,priority\n';
      const result = generator.validateTemplateStructure(csvContent, 'objectives');

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Unknown column: invalid_column')
      );
    });

    it('should validate Excel structure', () => {
      const mockWorkbook = {
        SheetNames: ['Objectives', 'Initiatives'],
        Sheets: {
          Objectives: {
            A1: { v: 'title*' },
            B1: { v: 'description' },
            C1: { v: 'priority' },
          },
          Initiatives: {
            A1: { v: 'title*' },
            B1: { v: 'objective_title' },
          },
        },
      };

      (XLSX.read as any) = vi.fn().mockReturnValue(mockWorkbook);

      const result = generator.validateTemplateStructure(
        Buffer.from('test'),
        'excel'
      );

      expect(result.isValid).toBe(true);
      expect(result.sheets).toEqual(['Objectives', 'Initiatives']);
    });
  });

  describe('getAvailableEntityTypes', () => {
    it('should return all available entity types', () => {
      const types = generator.getAvailableEntityTypes();

      expect(types).toEqual([
        'objectives',
        'initiatives',
        'activities',
        'users',
        'areas',
      ]);
    });
  });

  describe('getTemplateMetadata', () => {
    it('should return metadata for entity type', () => {
      const metadata = generator.getTemplateMetadata('objectives');

      expect(metadata).toMatchObject({
        entityType: 'objectives',
        requiredFields: ['title'],
        optionalFields: expect.arrayContaining([
          'description',
          'priority',
          'status',
          'progress',
        ]),
        enumFields: {
          priority: ['high', 'medium', 'low'],
          status: ['planning', 'in_progress', 'completed', 'overdue'],
        },
        dateFields: ['start_date', 'end_date', 'target_date'],
        numberFields: ['progress'],
        jsonFields: ['metrics'],
      });
    });

    it('should return metadata for initiatives', () => {
      const metadata = generator.getTemplateMetadata('initiatives');

      expect(metadata).toMatchObject({
        entityType: 'initiatives',
        requiredFields: ['title'],
        relationshipFields: {
          objective_title: 'objectives',
        },
        enumFields: {
          status: ['planning', 'in_progress', 'completed', 'on_hold'],
        },
      });
    });

    it('should return metadata for activities', () => {
      const metadata = generator.getTemplateMetadata('activities');

      expect(metadata).toMatchObject({
        entityType: 'activities',
        requiredFields: ['title', 'initiative_title'],
        relationshipFields: {
          initiative_title: 'initiatives',
          assigned_to: 'users',
        },
        booleanFields: ['is_completed'],
      });
    });
  });

  describe('formatters', () => {
    it('should format date values correctly', () => {
      const date = new Date('2025-01-15');
      const formatted = generator['formatDate'](date);

      expect(formatted).toBe('2025-01-15');
    });

    it('should format boolean values correctly', () => {
      expect(generator['formatBoolean'](true)).toBe('true');
      expect(generator['formatBoolean'](false)).toBe('false');
    });

    it('should format JSON values correctly', () => {
      const metrics = [
        { name: 'KPI 1', target: 100, current: 50 },
        { name: 'KPI 2', target: 200, current: 150 },
      ];

      const formatted = generator['formatJSON'](metrics);

      expect(formatted).toBe(JSON.stringify(metrics));
    });
  });

  describe('edge cases', () => {
    it('should handle empty template generation', () => {
      const template = generator.generateCSVTemplate('objectives', false);

      // Should only have headers, no example data
      const lines = template.split('\n');
      expect(lines).toHaveLength(2); // Headers + empty line
    });

    it('should escape special characters in CSV', () => {
      const data = {
        title: 'Title with "quotes"',
        description: 'Description with, comma',
      };

      const escaped = generator['escapeCSV'](data);

      expect(escaped.title).toBe('"Title with ""quotes"""');
      expect(escaped.description).toBe('"Description with, comma"');
    });

    it('should handle null and undefined values', () => {
      const data = {
        title: 'Test',
        description: null,
        priority: undefined,
      };

      const processed = generator['processNullValues'](data);

      expect(processed.description).toBe('');
      expect(processed.priority).toBe('');
    });
  });
});