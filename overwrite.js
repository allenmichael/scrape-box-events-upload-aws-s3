"use strict";
const Box = require('box-node-sdk');
const AWS = require('aws-sdk');
const BoxConfig = require('./config').BoxConfig;
const AWSConfig = require('./config').AWS;
const _ = require('lodash');
const autoPageWithStream = require('./util/autoPage').autoPageWithStream;
const autoPageWithOffset = require('./util/autoPage').autoPageWithOffset;
const fs = require('fs');
let checkForBucket = require('./util/checkForS3Bucket');
let createBucket = require('./util/createS3Bucket');
new AWS.Config({
    region: AWSConfig.region,
    credentials: {
        accessKeyId: AWSConfig.accessKeyId,
        secretAccessKey: AWSConfig.secretAccessKey
    }
});
let s3 = new AWS.S3();
let BoxSdk = new Box({
    clientID: BoxConfig.clientId,
    clientSecret: BoxConfig.clientSecret,
    appAuth: {
        keyID: BoxConfig.jwtPublicKeyId,
        privateKey: BoxConfig.jwtPrivateKey(),
        passphrase: BoxConfig.jwtPrivateKeyPassword
    }
});
let uploadParams = {
    Bucket: AWSConfig.s3Bucket,
    Key: `test.json`,
    Body: JSON.stringify({ goodbye: "world" })
}
s3.upload(uploadParams).promise()
    .then((data) => {
        console.log("Uploaded...");
        console.log(data);
    })
    .catch((err) => {
        console.log(err);
    });