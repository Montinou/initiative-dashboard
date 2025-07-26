# Phase 2: AI Integration with Context Awareness Workflow

## Overview
This workflow enhances the Vertex AI integration to provide context-aware analysis, dynamic SQL generation, and industry-specific insights.

## Objectives
- Enhance Vertex AI service for comprehensive context analysis
- Implement dynamic SQL generation based on actual data columns
- Create formula parser and validator for complex KPI calculations
- Add organization/client context to AI prompts
- Build robust response mapping and validation
- Implement industry-specific KPI suggestions
- Create AI prompt templates for different industries
- Add fallback mechanisms for AI failures

## Tasks

### Task 1: Enhance Vertex AI Service Architecture
**@vertex-ai-context-service**

**Steps:**
1. Use `Read` to examine `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/vertex_ai_service.py`
2. Use `MultiEdit` to create enhanced context analysis methods:
   - Add `analyze_data_context()` method to understand data structure
   - Create `extract_column_metadata()` for column type inference
   - Implement `detect_industry_context()` from data patterns
   - Add `build_contextual_prompt()` for dynamic prompts
3. Use `Edit` to add context caching mechanism:
   - Cache column metadata per project
   - Store industry detection results
   - Implement context expiration logic

### Task 2: Implement Dynamic SQL Generation
**@dynamic-sql-generator**

**Steps:**
1. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/sql_generator.py`:
   - Implement `SQLGenerator` class
   - Add `analyze_columns()` method to understand data types
   - Create `generate_kpi_query()` for dynamic SQL based on KPI formulas
   - Add SQL validation and sanitization
2. Use `MultiEdit` to integrate with BigQuery service:
   - Add `execute_dynamic_query()` method
   - Implement query result mapping
   - Add error handling for invalid SQL
3. Use `Write` to create unit tests at `/mnt/e/Projects/Stratix projectos/InsAIght/backend/tests/test_sql_generator.py`

### Task 3: Create Formula Parser and Validator
**@formula-parser**

**Steps:**
1. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/formula_parser.py`:
   - Implement `FormulaParser` class using AST
   - Add support for mathematical operations (+, -, *, /, ^)
   - Add aggregation functions (SUM, AVG, COUNT, MIN, MAX)
   - Implement conditional logic (IF, CASE)
   - Add date/time functions
2. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/formula_validator.py`:
   - Validate formula syntax
   - Check column references exist
   - Verify data type compatibility
   - Detect circular references
3. Use `Edit` to integrate parser with KPI configuration validation

### Task 4: Add Organization Context to AI Prompts
**@organization-context**

**Steps:**
1. Use `Edit` to modify `/mnt/e/Projects/Stratix projectos/InsAIght/backend/models/schemas.py`:
   - Add `OrganizationContext` model with industry, size, region fields
   - Add `AnalysisContext` model combining org and data context
2. Use `MultiEdit` to update analysis endpoints:
   - Modify `/api/v1/analyze` to accept organization context
   - Update `/api/v1/suggest-configuration` with context parameters
   - Enhance `/api/v1/generate-action-plans` with contextual insights
3. Use `Edit` to update Vertex AI prompts to include:
   - Organization industry and size
   - Historical performance context
   - Regional/market considerations

### Task 5: Build Response Mapping and Validation
**@response-mapping**

**Steps:**
1. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/ai_response_mapper.py`:
   - Implement `AIResponseMapper` class
   - Add JSON schema validation for AI responses
   - Create field mapping for different response types
   - Add data type conversion and formatting
2. Use `Write` to create response schemas at `/mnt/e/Projects/Stratix projectos/InsAIght/backend/models/ai_responses.py`:
   - Define `KPIAnalysisResponse` schema
   - Create `ActionPlanResponse` schema
   - Add `InsightResponse` schema with confidence scores
3. Use `Edit` to add response validation middleware:
   - Validate all AI responses before returning
   - Add retry logic for malformed responses
   - Log validation failures for improvement

### Task 6: Implement Industry-Specific KPI Suggestions
**@industry-kpis**

**Steps:**
1. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/data/industry_kpis.json`:
   - Define KPI templates for retail, manufacturing, finance, healthcare
   - Include standard formulas and thresholds
   - Add industry-specific metrics and benchmarks
2. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/industry_kpi_service.py`:
   - Load and manage industry KPI templates
   - Match detected industry to appropriate KPIs
   - Customize suggestions based on data availability
3. Use `Edit` to integrate with suggestion endpoint:
   - Auto-detect industry from data patterns
   - Suggest relevant KPIs based on industry
   - Provide industry benchmarks in analysis

### Task 7: Create AI Prompt Templates
**@prompt-templates**

**Steps:**
1. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/prompts/`:
   - Create `analysis_prompts.py` with analysis templates
   - Add `suggestion_prompts.py` for KPI suggestions
   - Create `action_plan_prompts.py` for action plans
   - Add `industry_prompts/` directory with industry-specific templates
2. Use `Write` to create prompt builder at `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/prompt_builder.py`:
   - Implement `PromptBuilder` class
   - Add template variable substitution
   - Create context injection methods
   - Add prompt optimization logic
3. Use `MultiEdit` to update Vertex AI service to use templates:
   - Replace hardcoded prompts with template system
   - Add prompt versioning for A/B testing
   - Implement prompt performance tracking

### Task 8: Add Fallback Mechanisms
**@ai-fallbacks**

**Steps:**
1. Use `Edit` to add fallback logic to Vertex AI service:
   - Implement retry with exponential backoff
   - Add circuit breaker pattern for API failures
   - Create fallback to simpler prompts on timeout
2. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/fallback_analysis.py`:
   - Implement rule-based analysis as fallback
   - Add basic statistical analysis without AI
   - Create simple action plan generation
3. Use `MultiEdit` to add fallback configuration:
   - Add fallback thresholds to settings
   - Implement fallback monitoring
   - Add user notification for degraded mode
   - Create fallback response indicators

### Task 9: Implement Context Caching
**@context-caching**

**Steps:**
1. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/context_cache.py`:
   - Implement in-memory cache with TTL
   - Add cache key generation for contexts
   - Create cache invalidation logic
2. Use `Edit` to integrate caching with:
   - Column metadata analysis
   - Industry detection results
   - AI prompt generation
   - Response validation schemas

### Task 10: Add Monitoring and Logging
**@ai-monitoring**

**Steps:**
1. Use `Edit` to add comprehensive logging:
   - Log all AI requests and responses
   - Track prompt performance metrics
   - Monitor fallback activation rates
2. Use `Write` to create `/mnt/e/Projects/Stratix projectos/InsAIght/backend/services/ai_metrics.py`:
   - Track response times
   - Monitor accuracy scores
   - Calculate fallback rates
   - Generate performance reports

## Dependencies
- Phase 1 infrastructure must be complete
- Vertex AI API credentials configured
- BigQuery tables created
- Industry KPI data collected

## Success Criteria
- [ ] Dynamic SQL generation works with any CSV structure
- [ ] Formula parser handles complex KPI calculations
- [ ] Industry detection accuracy > 80%
- [ ] AI responses validated and properly mapped
- [ ] Fallback mechanisms activate within 2 seconds
- [ ] Context-aware prompts improve relevance by 40%
- [ ] All prompt templates tested and optimized
- [ ] Monitoring dashboard shows AI performance metrics