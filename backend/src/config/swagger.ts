import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DB Query Portal API',
      version: '1.0.0',
      description: 'API for managing database query requests with approval workflow',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            code: { type: 'string', example: 'NOT_FOUND' },
            message: { type: 'string', example: 'Resource not found' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['DEVELOPER', 'MANAGER', 'ADMIN'] },
          },
        },
        Pod: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            manager: { $ref: '#/components/schemas/User' },
          },
        },
        DbInstance: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['POSTGRES', 'MONGODB'] },
          },
        },
        QueryRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            requester_id: { type: 'string', format: 'uuid' },
            pod_id: { type: 'string' },
            instance_id: { type: 'string', format: 'uuid' },
            database_name: { type: 'string' },
            submission_type: { type: 'string', enum: ['QUERY', 'SCRIPT'] },
            query_text: { type: 'string' },
            script_content: { type: 'string', nullable: true },
            comments: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'EXECUTED', 'REJECTED', 'FAILED'] },
            approved_by: { type: 'string', format: 'uuid', nullable: true },
            rejection_reason: { type: 'string', nullable: true },
            execution_result: { type: 'object', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            query_request_id: { type: 'string', format: 'uuid' },
            action: { type: 'string', enum: ['SUBMITTED', 'EXECUTED', 'REJECTED', 'FAILED'] },
            performed_by: { type: 'string', format: 'uuid' },
            performed_by_name: { type: 'string' },
            details: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                limit: { type: 'integer' },
                offset: { type: 'integer' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/docs/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);
