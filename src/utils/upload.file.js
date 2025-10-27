const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

/**
 * Upload file to Azure Blob Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimetype - File mimetype
 * @returns {Promise<Object>} - { success: boolean, url: string }
 */
const uploadToAzure = async (fileBuffer, originalName, mimetype) => {
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const fileExtension = originalName.split('.').pop();
        const blobName = `${uuidv4()}.${fileExtension}`;

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: mimetype
            }
        });

        return {
            success: true,
            url: blockBlobClient.url
        };
    } catch (error) {
        console.error('Error uploading to Azure:', error);
        return {
            success: false,
            url: null,
            error: error.message
        };
    }
};

module.exports = {
    uploadToAzure
};

