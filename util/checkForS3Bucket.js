'use strict';
const AWSConfig = require('../config').AWS;
const _ = require('lodash');

module.exports = function (s3) {
    return s3.listBuckets().promise()
        .then((buckets) => {
            let foundBucket = _.find(buckets.Buckets, (bucket) => {
                return bucket.Name === AWSConfig.s3Bucket;
            });
            return (foundBucket) ? true : false;
        });
}
