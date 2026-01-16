import multer from 'multer';

// Use memory storage - file content will be in req.file.buffer
const storage = multer.memoryStorage();

export const uploadScript = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_, file, cb) => {
    if (!file.originalname.endsWith('.js')) {
      return cb(new Error('Only .js files allowed'));
    }
    cb(null, true);
  }
});
