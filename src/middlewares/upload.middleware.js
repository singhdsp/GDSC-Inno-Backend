const {uploadToAzure} = require('../utils/upload.file');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFileMiddleware = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const result = await uploadToAzure(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file to Azure',
                error: result.error
            });
        }

        req.fileUrl = result.url;
        
        next();
    } catch (error) {
        console.error('Upload middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file',
            error: error.message
        });
    }
};

module.exports = {
    upload,
    uploadFileMiddleware
};
