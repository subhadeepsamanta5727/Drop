const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storageDir = path.resolve(__dirname, '..', 'private_storage');
fs.mkdirSync(storageDir, { recursive: true });

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: 15,
    fileSize: 25 * 1024 * 1024
  }
});

module.exports = { upload, storageDir };
