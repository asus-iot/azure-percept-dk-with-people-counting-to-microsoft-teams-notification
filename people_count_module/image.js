const fs = require('fs');
const childProcess = require('child_process');
const logger = require('./logger');
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = {
    IMAGE_FOLDER: 'captureImages',

    init: () => {
        let folderPath = module.exports.IMAGE_FOLDER
        // Check and create image folder
        if (!fs.existsSync(folderPath)) {
            fs.mkdir(folderPath, { recursive: true }, err => {
                if (err) {
                    logger.error(err);
                } else {
                    logger.info(`Image folder created successfully: ${folderPath}`);
                }
            });
        }
    },

    deleteImage: (imagePath, imageName) => {
        logger.info(`Delete image: ${imagePath}${imageName}`);
        fs.unlinkSync(imagePath + imageName);
    },

    captureImage: async (imagePath, imageName) => {
        return new Promise((resolve, reject) => {
            const RTSP_IP = process.env.RTSP_IP ? process.env.RTSP_IP : 'azureeyemodule';
            const RTSP_PORT = process.env.RTSP_PORT ? process.env.RTSP_PORT : '8554';
            const RTSP_PATH = process.env.RTSP_PATH ? process.env.RTSP_PATH : 'result';
            const RTSP_PROTOCOL = process.env.RTSP_PROTOCOL ? process.env.RTSP_PROTOCOL : 'udp';

            // Capture the image
            const ffmpegParams = `-rtsp_transport ${RTSP_PROTOCOL} -loglevel error -timeout 2000000 -y -i rtsp://${RTSP_IP}:${RTSP_PORT}/${RTSP_PATH} -vframes 1 -strftime 1 ${imagePath}${imageName}`;
            logger.info(`Running: ffmpeg ${ffmpegParams}`);

            const ffmpegCaptureProcess = childProcess.spawn('ffmpeg', ffmpegParams.split(' '));

            ffmpegCaptureProcess.on('exit', (code, signal) => {
                if (code === 0) {
                    logger.info(`ffmpeg exited with code ${code} and signal ${signal}`);
                    logger.info(stdoutData);
                    resolve();
                } else {
                    logger.error(`ffmpeg exited with code ${code} and signal ${signal}`);
                    logger.error(stderrData);
                    reject(new Error(stderrData));
                }
            });

            // buffer output
            let stdoutData = 'ffmpeg out: ';
            ffmpegCaptureProcess.stdout.on('data', output => {
                stdoutData += ' ' + logger.formatMessage(output);
            });

            // buffer errors
            let stderrData = 'ffmpeg error: ';
            ffmpegCaptureProcess.stderr.on('data', err => {
                stderrData += ' ' + logger.formatMessage(err);
            });
        });
    },

    uploadImages: async (imagePath, imageName) => {
        const filePath = imagePath + imageName;
        logger.info('Uploading image: ' + filePath);

        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;

        // create blob service client
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        // get container instance
        const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
        const blockBlobClient = containerClient.getBlockBlobClient(imageName);
        const uploadBlobResponse = await blockBlobClient.uploadFile(filePath);
        logger.info('Blob was uploaded successfully. requestId: ' + uploadBlobResponse.requestId);
        module.exports.deleteImage(imagePath, imageName);

        return blockBlobClient.url;
    },

    takeAndUpload: async () => {
        const screenshotImagePath = module.exports.IMAGE_FOLDER + '/';

        // Make capture data folder
        try {
            fs.mkdirSync(screenshotImagePath, { recursive: true });
            logger.info(`Directory created successfully: ${screenshotImagePath}`);

        } catch (err) {
            logger.error(logger.formatMessage(err));
            return;
        }

        try {
            const imageName = new Date().toISOString() + '.png';
            await module.exports.captureImage(screenshotImagePath, imageName);
            const url = await module.exports.uploadImages(screenshotImagePath, imageName);
            return url;
        } catch (err) {
            logger.error(err.message);
            return;
        }
    }
};