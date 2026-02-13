const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const Media = require('../models/Media');
const { verifyToken } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const fileType = Media.getFileType(file.mimetype);
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', fileType + 's');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (Media.isValidFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Apply authentication to all routes
router.use(verifyToken);

// Upload a file
router.post('/upload', uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  const fileType = Media.getFileType(req.file.mimetype);
  const maxSize = Media.getMaxFileSize(fileType);
  
  if (req.file.size > maxSize) {
    // Delete the uploaded file
    await fs.unlink(req.file.path);
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum size for ${fileType} is ${maxSize / (1024 * 1024)}MB`
    });
  }
  
  let thumbnailPath = null;
  let width = null;
  let height = null;
  
  // Generate thumbnail for images
  if (fileType === 'image') {
    try {
      const image = sharp(req.file.path);
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;
      
      // Generate thumbnail
      const thumbnailName = `thumb_${req.file.filename}`;
      thumbnailPath = path.join(path.dirname(req.file.path), 'thumbnails', thumbnailName);
      
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      
      await image
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      // Also compress original if too large
      if (req.file.size > 2 * 1024 * 1024) {
        const compressedPath = req.file.path + '.compressed.jpg';
        await sharp(req.file.path)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(compressedPath);
        
        await fs.unlink(req.file.path);
        await fs.rename(compressedPath, req.file.path);
        
        const stats = await fs.stat(req.file.path);
        req.file.size = stats.size;
      }
    } catch (err) {
      console.error('Error processing image:', err);
    }
  }
  
  // Create media record
  const media = await Media.create({
    uploader_id: req.user.id,
    file_name: req.file.filename,
    original_name: req.file.originalname,
    file_type: fileType,
    mime_type: req.file.mimetype,
    file_size: req.file.size,
    file_path: `/uploads/${fileType}s/${req.file.filename}`,
    thumbnail_path: thumbnailPath ? `/uploads/${fileType}s/thumbnails/thumb_${req.file.filename}` : null,
    width,
    height
  });
  
  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: media
  });
}));

// Upload multiple files
router.post('/upload/multiple', uploadLimiter, upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }
  
  const uploadedMedia = [];
  
  for (const file of req.files) {
    const fileType = Media.getFileType(file.mimetype);
    
    let thumbnailPath = null;
    let width = null;
    let height = null;
    
    if (fileType === 'image') {
      try {
        const image = sharp(file.path);
        const metadata = await image.metadata();
        width = metadata.width;
        height = metadata.height;
        
        const thumbnailName = `thumb_${file.filename}`;
        thumbnailPath = path.join(path.dirname(file.path), 'thumbnails', thumbnailName);
        
        await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
        
        await image
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }
    
    const media = await Media.create({
      uploader_id: req.user.id,
      file_name: file.filename,
      original_name: file.originalname,
      file_type: fileType,
      mime_type: file.mimetype,
      file_size: file.size,
      file_path: `/uploads/${fileType}s/${file.filename}`,
      thumbnail_path: thumbnailPath ? `/uploads/${fileType}s/thumbnails/thumb_${file.filename}` : null,
      width,
      height
    });
    
    uploadedMedia.push(media);
  }
  
  res.status(201).json({
    success: true,
    message: `${uploadedMedia.length} files uploaded successfully`,
    data: uploadedMedia
  });
}));

// Get media by ID
router.get('/:mediaId', asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.mediaId);
  
  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }
  
  res.json({
    success: true,
    data: media
  });
}));

// Get user's uploaded media
router.get('/user/uploads', asyncHandler(async (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;
  
  const media = await Media.findByUserId(req.user.id, {
    type,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.json({
    success: true,
    data: media
  });
}));

// Get shared media in a chat
router.get('/chat/:userId', asyncHandler(async (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;
  
  const media = await Media.getSharedMedia(req.user.id, parseInt(req.params.userId), {
    type,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.json({
    success: true,
    data: media
  });
}));

// Get shared media in a group
router.get('/group/:groupId', asyncHandler(async (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;
  
  const media = await Media.getGroupMedia(parseInt(req.params.groupId), {
    type,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.json({
    success: true,
    data: media
  });
}));

// Get storage usage
router.get('/user/storage', asyncHandler(async (req, res) => {
  const usage = await Media.getStorageUsage(req.user.id);
  
  res.json({
    success: true,
    data: usage
  });
}));

// Delete media
router.delete('/:mediaId', asyncHandler(async (req, res) => {
  const deleted = await Media.delete(parseInt(req.params.mediaId), req.user.id);
  
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Media not found or you do not have permission to delete it'
    });
  }
  
  res.json({
    success: true,
    message: 'Media deleted successfully'
  });
}));

module.exports = router;
