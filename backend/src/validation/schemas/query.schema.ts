import { z } from 'zod';

// Size limits (in characters)
const MAX_QUERY_SIZE = 50000;      // 50KB - reasonable for complex queries
const MAX_SCRIPT_SIZE = 5000000;   // 5MB - reasonable for large scripts
const MAX_COMMENTS_SIZE = 2000;    // 2KB - sufficient for comments
const MAX_DATABASE_NAME_SIZE = 100; // 100 chars - reasonable for DB names
const MAX_POD_ID_SIZE = 50;        // 50 chars - reasonable for pod IDs

// Custom validator for non-empty strings (trims whitespace)
const nonEmptyString = (fieldName: string, maxLength?: number) => {
  let validator = z.string()
    .min(1, `${fieldName} is required`)
    .refine((val) => val.trim().length > 0, `${fieldName} cannot be empty or contain only spaces`);
  
  if (maxLength) {
    validator = validator.max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`);
  }
  
  return validator;
};

export const submitQuerySchema = z.object({
  body: z.object({
    instanceId: z.string().uuid('Invalid instance ID'),
    databaseName: nonEmptyString('Database name', MAX_DATABASE_NAME_SIZE),
    queryText: z.string()
      .max(MAX_QUERY_SIZE, `Query text cannot exceed ${MAX_QUERY_SIZE} characters`)
      .optional(),
    podId: nonEmptyString('Pod ID', MAX_POD_ID_SIZE),
    comments: nonEmptyString('Comments', MAX_COMMENTS_SIZE),
    submissionType: z.enum(['QUERY', 'SCRIPT'], {
      message: 'Submission type must be QUERY or SCRIPT',
    }),
  })
  .refine((data) => {
    // For QUERY submissions, queryText is required and cannot be empty/whitespace
    if (data.submissionType === 'QUERY') {
      return data.queryText && data.queryText.trim().length > 0;
    }
    return true;
  }, {
    message: 'Query text is required for QUERY submissions and cannot be empty or contain only spaces',
    path: ['queryText']
  })
  .refine((data) => {
    // For QUERY submissions, check for multiple statements (semicolons)
    if (data.submissionType === 'QUERY' && data.queryText) {
      const trimmedQuery = data.queryText.trim();
      // Check for semicolons that are not at the very end
      const semicolonIndex = trimmedQuery.indexOf(';');
      if (semicolonIndex !== -1 && semicolonIndex < trimmedQuery.length - 1) {
        return false;
      }
      // Also reject if there are multiple semicolons
      const semicolonCount = (trimmedQuery.match(/;/g) || []).length;
      if (semicolonCount > 1) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Query mode supports single statements only. For multiple queries, use Script mode.',
    path: ['queryText']
  }),
});

// Add script size validation for file uploads
export const validateScriptSize = (content: string): boolean => {
  return content.length <= MAX_SCRIPT_SIZE;
};

export const queryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid query ID'),
  }),
});

export const rejectQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid query ID'),
  }),
  body: z.object({
    reason: z.string()
      .max(1000, 'Rejection reason cannot exceed 1000 characters')
      .optional(),
  }),
});

export const getQueriesSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    type: z.enum(['QUERY', 'SCRIPT']).optional(),
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .refine((val) => parseInt(val, 10) <= 100, 'Limit cannot exceed 100')
      .optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a positive integer').optional(),
  }),
});

export type SubmitQueryInput = z.infer<typeof submitQuerySchema>['body'];
export type QueryIdParam = z.infer<typeof queryIdParamSchema>['params'];
export type GetQueriesQuery = z.infer<typeof getQueriesSchema>['query'];

// Export constants for use in other modules
export { MAX_QUERY_SIZE, MAX_SCRIPT_SIZE, MAX_COMMENTS_SIZE };
