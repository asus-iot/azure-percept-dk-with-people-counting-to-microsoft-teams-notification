const transport = require('azure-iot-device-mqtt').Mqtt;
const moduleClient = require('azure-iot-device').ModuleClient;
const Message = require('azure-iot-device').Message;
const logger = require('./logger')
const image = require('./image')

// Initial capture camera image environment
image.init();

// Create module client from environment
moduleClient.fromEnvironment(transport, (err, client) => {
    if (err) {
        throw err;
    } else {
        client.on('error', err => {
            throw err;
        });

        // connect to the Edge instance
        let retryCount = 0;
        const retryTimes = 15;
        const retryDelay = 1000; // milliseconds

        const openClient = () => {
            client.open(err => {
                ++retryCount;
                if (err) {
                    if (retryCount >= retryTimes) {
                        // if it fails too many times, throw the error.
                        throw err;
                    } else {
                        //log the error
                        logger.error(err);
                        // try again after a delay that increases with each attempt
                        const retryTime = retryDelay * retryCount;
                        logger.error(`Attempting to reconnect to IoT Hub in: ${retryTime} milliseconds.`);
                        setTimeout(openClient, retryTime);
                    }
                } else {
                    logger.info('IoT Hub module client initialized successfully');

                    const inputPort = 'input1';
                    const outputPort = 'output1';
                    const PEOPLE_THRESHOLD = process.env.PEOPLE_THRESHOLD;
                    const PERSON_CONFIDENCE_THRESHOLD = process.env.PERSON_CONFIDENCE_THRESHOLD;
                    logger.info('env PEOPLE_THRESHOLD: ' + PEOPLE_THRESHOLD);
                    logger.info('env PERSON_CONFIDENCE_THRESHOLD: ' + PERSON_CONFIDENCE_THRESHOLD);

                    // Act on input messages to the module
                    client.on('inputMessage', (inputName, msg) => {
                        client.complete(msg, logger.info(`message from ${inputName} received`));

                        if (inputName == inputPort) {
                            const data = JSON.parse(msg.data);
                            let count = 0;
                            let timestamp = '';
                            data.NEURAL_NETWORK.forEach(result => {
                                const label = result.label;
                                const confidence = parseFloat(result.confidence);
                                timestamp = result.timestamp;   // each object detect timestamp is equal in the message
                                logger.info(`label: ${label}, confidence: ${confidence}, timestamp ${timestamp}`);
                                if (confidence >= PERSON_CONFIDENCE_THRESHOLD && label == 'person') {
                                    count++;
                                }
                            });

                            logger.info('count: ' + count);
                            if (count >= PEOPLE_THRESHOLD) {
                                // capture camera image and upload
                                const telemetry = { count: count, url: '', timestamp: timestamp };
                                image.takeAndUpload().then(blobUrl => {
                                    logger.info('get image blob url: ' + blobUrl);
                                    telemetry.url = blobUrl;
                                    const message = new Message(JSON.stringify(telemetry));
                                    client.sendOutputEvent(outputPort, message, logger.info(`send message to ${outputPort} completed`));
                                }).catch(err => {
                                    logger.error(err);
                                    const message = new Message(JSON.stringify(telemetry));
                                    client.sendOutputEvent(outputPort, message, logger.info(`send message to ${outputPort} completed`));
                                });
                            }
                        } else {
                            logger.error(`unknown inputMessage received on input ${inputName} with ` + msg.getBytes.toString('ascii'));
                        }
                    });
                }
            });
        }

        openClient();
    }
});