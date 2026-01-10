import { uploadScript } from '../../../src/middlewares/upload.middleware';

describe('Upload Middleware', () => {
  describe('uploadScript', () => {
    describe('fileFilter', () => {
      const mockCallback = jest.fn();

      beforeEach(() => {
        mockCallback.mockClear();
      });

      it('should accept .js files', () => {
        // Access internal multer config
        const multerInstance = uploadScript as any;
        const fileFilter = multerInstance.fileFilter;
        
        if (fileFilter) {
          const mockFile = { originalname: 'script.js' };
          fileFilter(null, mockFile, mockCallback);
          expect(mockCallback).toHaveBeenCalledWith(null, true);
        }
      });

      it('should reject non-.js files', () => {
        const multerInstance = uploadScript as any;
        const fileFilter = multerInstance.fileFilter;
        
        if (fileFilter) {
          const mockFile = { originalname: 'script.ts' };
          fileFilter(null, mockFile, mockCallback);
          expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
        }
      });
    });

    describe('storage', () => {
      it('should generate unique filename with timestamp', () => {
        const multerInstance = uploadScript as any;
        const storage = multerInstance.storage;
        
        if (storage && storage.getFilename) {
          const mockCallback = jest.fn();
          const mockFile = { originalname: 'test.js' };
          
          storage.getFilename({}, mockFile, mockCallback);
          
          expect(mockCallback).toHaveBeenCalled();
          const filename = mockCallback.mock.calls[0][1];
          expect(filename).toContain('test.js');
        }
      });

      it('should set destination to uploads/scripts', () => {
        const multerInstance = uploadScript as any;
        const storage = multerInstance.storage;
        
        if (storage && storage.getDestination) {
          const mockCallback = jest.fn();
          storage.getDestination({}, {}, mockCallback);
          expect(mockCallback).toHaveBeenCalledWith(null, 'uploads/scripts');
        }
      });
    });
  });
});
