const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const app = express();

// Load environment variables
require('dotenv').config();

// Initialize OpenAI client (only if API key is available)
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit
});

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for local development

// Serve static files: project root first (so edits to drone-map.html etc. show immediately), then _site
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, '_site')));

// Initialize Google Drive API
let drive;
if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    // Initialize Google Drive API with service account
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || 'service-account-key.json',
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    
    drive = google.drive({ version: 'v3', auth });
}

// FAQ Search Endpoint
app.post('/ask-faq', async (req, res) => {
    try {
        const { question } = req.body;
        console.log('Received question:', question); // Debug log

        // Create a thread
        const thread = await openai.beta.threads.create();

        // Add the message to the thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: question
        });

        // Start a run with the specific assistant ID
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: "asst_qfx0mNGSXFvQkeAAgsUxD0GN"
        });

        // Poll for completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(m => m.role === 'assistant');
        const faqId = assistantMessage.content[0].text.value;

        console.log('Response:', faqId); // Debug log
        res.json({ faqId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

// Contribution Data Upload Endpoint
app.post('/api/upload-contribution', upload.fields([
    { name: 'media-files', maxCount: 100 },
    { name: 'flight-log', maxCount: 100 },
    { name: 'ground-truth', maxCount: 100 }
]), async (req, res) => {
    try {
        const { timestamp } = req.body;
        const uploadedFiles = [];
        const errors = [];

        if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
            throw new Error('Google Drive folder ID not configured. Please set GOOGLE_DRIVE_FOLDER_ID in environment variables.');
        }

        if (!drive) {
            throw new Error('Google Drive API not initialized. Please configure service account credentials.');
        }

        // Create a folder with timestamp in the parent Google Drive folder
        const folderName = `contribution-${timestamp}`;
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        };

        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });

        const folderId = folder.data.id;
        console.log(`Created folder: ${folderName} (ID: ${folderId})`);

        // Upload all files to the created folder
        const fileFields = ['media-files', 'flight-log', 'ground-truth'];
        
        for (const fieldName of fileFields) {
            const files = req.files[fieldName] || [];
            
            for (const file of files) {
                try {
                    const fileMetadata = {
                        name: file.originalname,
                        parents: [folderId]
                    };

                    const media = {
                        mimeType: file.mimetype,
                        body: fs.createReadStream(file.path)
                    };

                    const uploadedFile = await drive.files.create({
                        resource: fileMetadata,
                        media: media,
                        fields: 'id, name'
                    });

                    uploadedFiles.push({
                        name: file.originalname,
                        id: uploadedFile.data.id,
                        category: fieldName
                    });

                    console.log(`Uploaded: ${file.originalname} to ${folderName}`);

                    // Clean up temporary file
                    fs.unlinkSync(file.path);
                } catch (error) {
                    console.error(`Error uploading ${file.originalname}:`, error);
                    errors.push({ file: file.originalname, error: error.message });
                    
                    // Clean up temporary file even on error
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                }
            }
        }

        if (errors.length > 0 && uploadedFiles.length === 0) {
            // If all uploads failed, delete the folder
            try {
                await drive.files.delete({ fileId: folderId });
            } catch (error) {
                console.error('Error deleting folder:', error);
            }
            throw new Error(`Failed to upload files: ${errors.map(e => e.error).join(', ')}`);
        }

        res.json({
            success: true,
            folderId: folderId,
            folderName: folderName,
            uploadedFiles: uploadedFiles,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error in upload-contribution:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred while uploading files'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
}); 