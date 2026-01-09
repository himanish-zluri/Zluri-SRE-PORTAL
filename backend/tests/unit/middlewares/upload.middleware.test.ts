import { uploadScript } from '../../../src/middlewares/upload.middleware';

describe('Upload Middleware', () => {
  describe('uploadScript', () => {
    it('should be a multer instance', () => {
      expect(uploadScript).toBeDefined();
      expect(uploadScript.single).toBeDefined();
      expect(typeof uploadScript.single).toBe('function');
    });

    it('should have single method for file upload', () => {
      const middleware = uploadScript.single('script');
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });
});
