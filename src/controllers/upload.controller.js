const uploadFile = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            url: req.fileUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file',
            error: error.message
        });
    }
};

module.exports = {
    uploadFile
};