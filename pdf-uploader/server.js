const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { put, list } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Setup multer for memory storage (since we're uploading to Blob)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Upload endpoint using Vercel Blob
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF file' });
  }

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + req.file.originalname;

    // Upload to Vercel Blob
    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: 'application/pdf',
      // Requires BLOB_READ_WRITE_TOKEN in environment variables
    });

    res.json({ 
      message: 'File uploaded successfully',
      filename: blob.pathname,
      originalName: req.file.originalname,
      url: blob.url
    });
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    res.status(500).json({ error: 'Failed to upload to cloud storage. Ensure BLOB_READ_WRITE_TOKEN is set in Vercel.' });
  }
});

// List files endpoint from Vercel Blob
app.get('/api/files', async (req, res) => {
  try {
    const { blobs } = await list();
    
    // Format similar to what the frontend expects
    const pdfFiles = blobs.filter(b => b.pathname.endsWith('.pdf')).map(blob => {
      let originalName = blob.pathname;
      const dashIndex = originalName.indexOf('-');
      if (dashIndex !== -1 && originalName.substring(0, dashIndex).match(/^\d+$/)) {
          const secondDash = originalName.indexOf('-', dashIndex + 1);
          if (secondDash !== -1) {
              originalName = originalName.substring(secondDash + 1);
          }
      }

      return {
        filename: blob.pathname,
        originalName: originalName,
        size: blob.size,
        date: blob.uploadedAt,
        downloadUrl: blob.downloadUrl // Vercel Blob provides this for forced download
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first
    
    res.json(pdfFiles);
  } catch (error) {
    console.error('Error fetching from Vercel Blob:', error);
    res.status(500).json({ error: 'Unable to scan files from cloud storage. Ensure BLOB_READ_WRITE_TOKEN is set.' });
  }
});

// Export app for Vercel Serverless
module.exports = app;

// Only listen locally if not running in Vercel Serverless environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
