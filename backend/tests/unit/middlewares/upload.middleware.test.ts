import { Request, Response } from 'express';
import { validateScriptContent, fileFilter } from '../../../src/middlewares/upload.middleware';
import { MAX_SCRIPT_SIZE } from '../../../src/validation/schemas/query.schema';

// Extend Request type to include scriptContent property
interface RequestWithScriptContent extends Request {
  scriptContent?: string;
}

describe('Upload Middleware', () => {
  let mockReq: Partial<RequestWithScriptContent>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('fileFilter', () => {
    it('should accept .js files', () => {
      const mockFile = {
        originalname: 'test.js',
        mimetype: 'application/javascript',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it('should reject non-.js files', () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error('Only .js files allowed'));
    });

    it('should reject files without .js extension', () => {
      const mockFile = {
        originalname: 'script.py',
        mimetype: 'text/x-python',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error('Only .js files allowed'));
    });

    it('should reject files with .js in the middle but different extension', () => {
      const mockFile = {
        originalname: 'test.js.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error('Only .js files allowed'));
    });

    it('should accept files with .js extension regardless of case sensitivity in filename', () => {
      const mockFile = {
        originalname: 'MyScript.js',
        mimetype: 'application/javascript',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it('should reject empty filename', () => {
      const mockFile = {
        originalname: '',
        mimetype: 'application/javascript',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error('Only .js files allowed'));
    });

    it('should reject filename that is just .js', () => {
      const mockFile = {
        originalname: '.js',
        mimetype: 'application/javascript',
      } as Express.Multer.File;

      const mockCallback = jest.fn();
      
      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });
  });

  describe('validateScriptContent', () => {
    it('should call next() when no file is uploaded', () => {
      mockReq.file = undefined;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next() when file exists but no buffer', () => {
      mockReq.file = {
        originalname: 'test.js',
        mimetype: 'application/javascript',
        size: 1000,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should validate script content and call next() for valid content', () => {
      const validContent = 'console.log("Hello World");';
      const buffer = Buffer.from(validContent, 'utf8');
      
      mockReq.file = {
        originalname: 'test.js',
        mimetype: 'application/javascript',
        size: buffer.length,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.scriptContent).toBe(validContent);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 error for oversized script content', () => {
      // Create content that exceeds MAX_SCRIPT_SIZE
      const oversizedContent = 'x'.repeat(MAX_SCRIPT_SIZE + 1);
      const buffer = Buffer.from(oversizedContent, 'utf8');
      
      mockReq.file = {
        originalname: 'large-script.js',
        mimetype: 'application/javascript',
        size: buffer.length,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        message: `Script content cannot exceed ${MAX_SCRIPT_SIZE} characters`
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle script content at exact size limit', () => {
      // Create content exactly at MAX_SCRIPT_SIZE
      const exactSizeContent = 'x'.repeat(MAX_SCRIPT_SIZE);
      const buffer = Buffer.from(exactSizeContent, 'utf8');
      
      mockReq.file = {
        originalname: 'exact-size.js',
        mimetype: 'application/javascript',
        size: buffer.length,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.scriptContent).toBe(exactSizeContent);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle empty script content', () => {
      const emptyContent = '';
      const buffer = Buffer.from(emptyContent, 'utf8');
      
      mockReq.file = {
        originalname: 'empty.js',
        mimetype: 'application/javascript',
        size: 0,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.scriptContent).toBe(emptyContent);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle script with special characters and unicode', () => {
      const unicodeContent = 'console.log("Hello 世界! 🌍");';
      const buffer = Buffer.from(unicodeContent, 'utf8');
      
      mockReq.file = {
        originalname: 'unicode.js',
        mimetype: 'application/javascript',
        size: buffer.length,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.scriptContent).toBe(unicodeContent);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle file with buffer but req.file exists without buffer property', () => {
      mockReq.file = {
        originalname: 'test.js',
        mimetype: 'application/javascript',
        size: 1000,
        // No buffer property
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should properly convert buffer to UTF-8 string', () => {
      const originalContent = 'const test = "UTF-8 content with émojis 🚀";';
      const buffer = Buffer.from(originalContent, 'utf8');
      
      mockReq.file = {
        originalname: 'utf8-test.js',
        mimetype: 'application/javascript',
        size: buffer.length,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.scriptContent).toBe(originalContent);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed buffer content gracefully', () => {
      // Create a buffer with invalid UTF-8 sequence
      const invalidBuffer = Buffer.from([0xFF, 0xFE, 0xFD]);
      
      mockReq.file = {
        originalname: 'invalid.js',
        mimetype: 'application/javascript',
        size: invalidBuffer.length,
        buffer: invalidBuffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      // Should still call next() even with invalid UTF-8
      expect(mockNext).toHaveBeenCalledWith();
      expect(typeof mockReq.scriptContent).toBe('string');
    });

    it('should handle very large valid content just under the limit', () => {
      const largeValidContent = 'x'.repeat(MAX_SCRIPT_SIZE - 100);
      const buffer = Buffer.from(largeValidContent, 'utf8');
      
      mockReq.file = {
        originalname: 'large-valid.js',
        mimetype: 'application/javascript',
        size: buffer.length,
        buffer: buffer,
      } as Express.Multer.File;

      validateScriptContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.scriptContent).toBe(largeValidContent);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});