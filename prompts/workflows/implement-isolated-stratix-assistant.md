<task name="Implement Isolated Stratix Assistant">

<task_objective>
Create a standalone, isolated implementation of the Stratix Assistant that can be tested independently from the main Mariana application. Input includes existing stratix-assistant configuration files (agent-config.json, instructions.md, stratix-bot-config.md), Supabase Edge Function (stratix-handler), and documentation files. Output will be a complete standalone application with its own dependencies, configuration, test environment, and isolated database setup that mirrors the functionality of the integrated assistant.
</task_objective>

<detailed_sequence_steps>
# Implement Isolated Stratix Assistant Process - Detailed Sequence of Steps

## 1. Create Standalone Project Structure

1. Use the `bash` command to create isolated project directory:
   ```bash
   mkdir stratix-assistant-standalone && cd stratix-assistant-standalone
   ```

2. Use the `write_to_file` command to create standalone `package.json`:
   - Include minimal dependencies: Supabase client, Express/Fastify for API server
   - Add development dependencies: TypeScript, testing framework, nodemon
   - Define scripts for development, testing, and production builds

3. Use the `write_to_file` command to create `tsconfig.json`:
   - Configure TypeScript for Node.js environment
   - Set strict mode and proper module resolution

4. Use the `bash` command to initialize project:
   ```bash
   npm install
   ```

## 2. Extract and Isolate Core Assistant Logic

1. Use the `read_file` command to analyze existing `/mnt/e/Projects/Mariana projectos/Mariana/supabase/functions/stratix-handler/index.ts`

2. Use the `write_to_file` command to create `src/core/stratix-handler.ts`:
   - Extract the edge function logic into standalone TypeScript module
   - Remove Deno-specific dependencies and replace with Node.js equivalents
   - Maintain all database query functions (getInitiativeStatus, getAreaKPIs, etc.)

3. Use the `write_to_file` command to create `src/core/database-client.ts`:
   - Implement Supabase client initialization for Node.js environment
   - Handle authentication and RLS configuration
   - Provide connection management utilities

4. Use the `write_to_file` command to create `src/types/assistant.ts`:
   - Define TypeScript interfaces for all assistant operations
   - Include request/response types, database entity types
   - Export shared types for consistency

## 3. Implement Standalone API Server

1. Use the `write_to_file` command to create `src/server/app.ts`:
   - Create Express/Fastify server application
   - Implement CORS handling for local development
   - Set up middleware for request logging and error handling

2. Use the `write_to_file` command to create `src/server/routes/assistant.ts`:
   - Implement RESTful endpoints that mirror the edge function actions
   - Handle POST /api/initiative-status, /api/area-kpis, etc.
   - Add proper request validation and error responses

3. Use the `write_to_file` command to create `src/server/middleware/auth.ts`:
   - Implement authentication middleware for API endpoints
   - Handle Supabase JWT token validation
   - Provide user context extraction

4. Use the `write_to_file` command to create `src/server/index.ts`:
   - Main server entry point
   - Load environment configuration
   - Start server with proper error handling

## 4. Create Isolated Database Setup

1. Use the `write_to_file` command to create `database/setup.sql`:
   - Copy relevant database schema from main project
   - Include initiatives, areas, users tables
   - Add sample data for testing purposes

2. Use the `write_to_file` command to create `database/seed-data.sql`:
   - Create test initiatives with various statuses and progress levels
   - Add sample company areas (Administración, Comercial, Producto, RRHH)
   - Include test users and relationships

3. Use the `write_to_file` command to create `src/config/database.ts`:
   - Database configuration management
   - Environment-specific connection settings
   - Connection pooling and retry logic

4. Use the `write_to_file` command to create `scripts/setup-database.ts`:
   - Automated database initialization script
   - Run schema creation and data seeding
   - Verify database connectivity

## 5. Implement Testing Infrastructure

1. Use the `write_to_file` command to create `tests/setup.ts`:
   - Test environment configuration
   - Database setup and teardown for tests
   - Mock data generation utilities

2. Use the `write_to_file` command to create `tests/core/stratix-handler.test.ts`:
   - Unit tests for all assistant functions
   - Test each action: get_initiative_status, get_area_kpis, etc.
   - Mock database responses and validate outputs

3. Use the `write_to_file` command to create `tests/server/api.test.ts`:
   - Integration tests for API endpoints
   - Test request/response cycles
   - Validate error handling and edge cases

4. Use the `write_to_file` command to create `tests/database/queries.test.ts`:
   - Database integration tests
   - Test RLS policies and data isolation
   - Validate query performance and results

## 6. Create Configuration and Environment Management

1. Use the `write_to_file` command to create `.env.example`:
   - Document all required environment variables
   - Include Supabase URL, anon key, database URLs
   - Add development vs production configurations

2. Use the `write_to_file` command to create `src/config/index.ts`:
   - Centralized configuration management
   - Environment variable validation
   - Type-safe configuration exports

3. Use the `write_to_file` command to create `docker-compose.yml`:
   - Local PostgreSQL database for testing
   - Redis for caching if needed
   - Development environment setup

4. Use the `write_to_file` command to create `Dockerfile`:
   - Production-ready container image
   - Multi-stage build for optimization
   - Health checks and proper signal handling

## 7. Add Development and Testing Tools

1. Use the `write_to_file` command to create `src/cli/test-assistant.ts`:
   - Command-line interface for testing assistant responses
   - Interactive mode for manual testing
   - Batch testing with predefined scenarios

2. Use the `write_to_file` command to create `scripts/generate-test-data.ts`:
   - Generate realistic test data for various scenarios
   - Create edge cases and boundary conditions
   - Export data for use in automated tests

3. Use the `write_to_file` command to create `src/utils/logger.ts`:
   - Structured logging for debugging
   - Different log levels for development/production
   - Request tracing capabilities

4. Use the `write_to_file` command to create `scripts/health-check.ts`:
   - Verify all assistant functions are working
   - Check database connectivity
   - Validate API endpoint responses

## 8. Documentation and Deployment

1. Use the `write_to_file` command to create `README.md`:
   - Complete setup and installation instructions
   - Architecture overview and component descriptions
   - API documentation with example requests/responses
   - Testing procedures and development workflow

2. Use the `write_to_file` command to create `docs/API.md`:
   - Detailed API endpoint documentation
   - Request/response schemas
   - Error codes and handling
   - Authentication requirements

3. Use the `write_to_file` command to create `docs/DEVELOPMENT.md`:
   - Development environment setup
   - Code organization and patterns
   - Testing guidelines and practices
   - Contribution guidelines

4. Use the `write_to_file` command to create `scripts/deploy.sh`:
   - Deployment automation script
   - Environment validation
   - Database migration execution
   - Health check verification

## 9. Integration Testing and Validation

1. Use the `bash` command to run complete test suite:
   ```bash
   npm test
   ```

2. Use the `bash` command to start development server:
   ```bash
   npm run dev
   ```

3. Use the `bash` command to test all assistant functions:
   ```bash
   npm run test:integration
   ```

4. Use the `write_to_file` command to create `tests/scenarios/real-world.test.ts`:
   - End-to-end testing scenarios
   - Simulate real user interactions
   - Test complex query combinations

5. Validate isolated functionality by testing each assistant action independently

## 10. Performance and Monitoring Setup

1. Use the `write_to_file` command to create `src/monitoring/metrics.ts`:
   - Performance monitoring for database queries
   - Response time tracking
   - Error rate monitoring

2. Use the `write_to_file` command to create `src/monitoring/health.ts`:
   - Health check endpoints for monitoring
   - Database connection status
   - Service dependency checks

3. Use the `bash` command to run performance tests:
   ```bash
   npm run test:performance
   ```

4. Generate performance baseline and optimization recommendations

</detailed_sequence_steps>

</task>