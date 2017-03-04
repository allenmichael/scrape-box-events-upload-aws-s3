'use strict';
class AWSService {
    constructor() {
        this.AWS = require('aws-sdk');
        new this.AWS.Config({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
    }

    getS3Client() {
        return new this.AWS.S3();
    }

    getKinesisClient() {
        return new this.AWS.Kinesis();
    }

    getDynamoClient() {
        return new this.AWS.DynamoDB.DocumentClient();
    }
}

module.exports = new AWSService;