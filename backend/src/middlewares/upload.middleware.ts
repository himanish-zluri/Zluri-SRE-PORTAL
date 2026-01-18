import multer from 'multer';
import { MAX_SCRIPT_SIZE, validateScriptSize } from '../validation/schemas/query.schema';

// Use memory storage - file content will be in req.file.buffer
const storage = multer.memoryStorage();

// Extract fileFilter function for better testability
export const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.originalname.endsWith('.js')) {
    return cb(new Error('Only .js files allowed'));
  }
  cb(null, true);
};

export const uploadScript = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024,  // 5MB file size limit
    files: 1,                   // Only 1 file allowed
  },
  fileFilter
});

// Middleware to validate script content size after upload
export const validateScriptContent = (req: any, res: any, next: any) => {
  if (req.file && req.file.buffer) {
    const content = req.file.buffer.toString('utf8');
    
    if (!validateScriptSize(content)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Script content cannot exceed ${MAX_SCRIPT_SIZE} characters`
      });
    }
    
    // Add the content to the request for further processing
    req.scriptContent = content;
  }
  
  next();
};
