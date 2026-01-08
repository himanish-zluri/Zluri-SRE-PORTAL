import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'uploads/scripts',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

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
