'use strict';
const fs = require('fs');
const path = require('path');

module.exports.BoxConfig = {
    clientId: "",
    clientSecret: "",
    enterpriseId: "",
    jwtPrivateKeyFileName: "private_key.pem",
    jwtPrivateKeyPassword: "password",
    jwtPrivateKey: () => {
        let certPath = path.resolve(this.BoxConfig.jwtPrivateKeyFileName)
        return fs.readFileSync(certPath);
    },
    jwtPublicKeyId: ""
}

module.exports.AWS = {
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-west-2",
    s3Bucket: "box-appuser-events"
}