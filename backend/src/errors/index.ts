// Base error class
export { AppError } from './AppError';

// HTTP 4xx Client Errors
export { BadRequestError } from './BadRequestError';
export { UnauthorizedError } from './UnauthorizedError';
export { ForbiddenError } from './ForbiddenError';
export { NotFoundError } from './NotFoundError';
export { ConflictError } from './ConflictError';
export { ValidationError, type FieldError } from './ValidationError';

// HTTP 5xx Server Errors
export { InternalError } from './InternalError';
