'use strict';
const AWSConfig = require('../config').AWS;

module.exports = function (s3) {
    let params = {
        Bucket: AWSConfig.s3Bucket
    };
    return s3.createBucket(params).promise()
        .then((bucket) => {
            return (bucket) ? true : false;
        });
}
