import express from 'express';
import upload from '../config/upload.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Single image upload endpoint
router.post('/single', (req, res) => {
  const uploadSingle = upload.single('image');
  
  uploadSingle(req, res, (err) => {
    try {
      if (err) {
        console.error('Upload error:', err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: 'File too large. Maximum size is 5MB.' 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              message: 'Too many files. Only 1 file allowed.' 
            });
          }
        }
        
        return res.status(400).json({ 
          message: err.message || 'Upload failed' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          message: 'No file uploaded. Please select an image file.' 
        });
      }

      // Return the file path that can be used in the frontend
      const filePath = `/uploads/${req.file.filename}`;
      
      console.log('File uploaded successfully:', {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        path: filePath
      });
      
      res.json({
        message: 'File uploaded successfully',
        filePath,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Unexpected upload error:', error);
      res.status(500).json({ 
        message: 'Internal server error during upload',
        error: error.message 
      });
    }
  });
});

// Multiple images upload endpoint (for future use)
router.post('/multiple', (req, res) => {
  const uploadMultiple = upload.array('images', 5);
  
  uploadMultiple(req, res, (err) => {
    try {
      if (err) {
        console.error('Multiple upload error:', err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: 'One or more files are too large. Maximum size is 5MB per file.' 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              message: 'Too many files. Maximum 5 files allowed.' 
            });
          }
        }
        
        return res.status(400).json({ 
          message: err.message || 'Upload failed' 
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          message: 'No files uploaded. Please select image files.' 
        });
      }

      const filePaths = req.files.map(file => `/uploads/${file.filename}`);
      
      console.log('Multiple files uploaded successfully:', {
        count: req.files.length,
        files: req.files.map(f => ({ name: f.originalname, size: f.size }))
      });
      
      res.json({
        message: 'Files uploaded successfully',
        filePaths,
        count: req.files.length
      });
    } catch (error) {
      console.error('Unexpected multiple upload error:', error);
      res.status(500).json({ 
        message: 'Internal server error during upload',
        error: error.message 
      });
    }
  });
});

export default router;