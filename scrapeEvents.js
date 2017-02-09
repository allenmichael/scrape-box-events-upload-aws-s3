"use strict";
const Box = require('box-node-sdk');
const AWS = require('aws-sdk');
const BoxConfig = require('./config').BoxConfig;
const AWSConfig = require('./config').AWS;
const _ = require('lodash');
const autoPageWithStream = require('./util/autoPage').autoPageWithStream;
const autoPageWithOffset = require('./util/autoPage').autoPageWithOffset;
const fs = require('fs');
const moment = require('moment');
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
let BoxAdminClient = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseId);
let allEvents = [];
let allEventsProcessed = [];
let totalCount = 0;
module.exports = function (options) {
    options = options || {};
    options.interval = options.interval || 2;
    options.time_measurement = options.time_measurement || "weeks";
    
    if (!_.has(options, "created_before")) {
        options.created_before = moment().format();
    }
    if (!_.has(options, "created_after")) {
        options.created_after = moment().subtract(options.interval, options.time_measurement).format();
    }
    console.log(`Scraping events that happened before ${options.created_before} and after ${options.created_after}`);
    checkForBucket(s3)
        .then((bucketExists) => {
            console.log(bucketExists);
            if (!bucketExists) {
                console.log("No bucket found...");
                console.log("Creating bucket...");
                return createBucket(s3);
            } else {
                console.log("Bucket found...");
                return true;
            }
        })
        .then((bucketExists) => {
            autoPageWithStream(BoxAdminClient, "events", "get", null, { limit: 500, stream_type: "admin_logs", created_before: options.created_before, created_after: options.created_after }, function (err, enterpriseEvents) {
                console.log(`Enterprise event count: ${enterpriseEvents.length}`);
                totalCount += enterpriseEvents.length;
                allEvents = allEvents.concat(enterpriseEvents);
                autoPageWithStream(BoxAdminClient, "events", "get", null, { limit: 500, created_before: options.created_before, created_after: options.created_after }, function (err, automationUserEvents) {
                    console.log(`Processing events for automation user`);
                    console.log(automationUserEvents.length);
                    totalCount += automationUserEvents.length;
                    allEvents = allEvents.concat(automationUserEvents);
                    new Promise((resolve, reject) => {
                        autoPageWithOffset(BoxAdminClient, "enterprise", "getUsers", null, { fields: "id,login" }, function (err, users) {
                            users.forEach(function (user) {
                                BoxAdminClient.asUser(user.id);
                                allEventsProcessed.push(new Promise((resolve, reject) => {
                                    autoPageWithStream(BoxAdminClient, "events", "get", null, { limit: 500, created_before: options.created_before, created_after: options.created_after }, function (err, entries) {
                                        console.log(`Processing events for user ${user.id} -- ${user.login}`);
                                        console.log(entries.length);
                                        totalCount += entries.length;
                                        allEvents = allEvents.concat(entries);
                                        resolve();
                                    });
                                }));
                            });
                            return Promise.all(allEventsProcessed)
                                .then(() => {
                                    resolve();
                                })
                        });
                    })
                        .then(() => {
                            console.log("Finished processing...");
                            console.log(allEvents.length);
                            console.log("Deduplication...");
                            let dedupedAllEvents = _.uniqBy(allEvents, "event_id");
                            console.log(dedupedAllEvents.length);
                            console.log(`Totaled events: ${totalCount}`);
                            let allEventsLoggedToS3 = [];
                            console.log("Converting datetimes for Hive...");
                            dedupedAllEvents.forEach(function (event) {
                                event.created_at = moment(event.created_at).format('YYYY-MM-DD hh:mm:ss');
                                event.recorded_at = moment(event.recorded_at).format('YYYY-MM-DD hh:mm:ss');
                                if (event && event.source && event.source.created_at && event.source.modified_at) {
                                    event.source.created_at = moment(event.source.created_at).format('YYYY-MM-DD hh:mm:ss');
                                    event.source.modified_at = moment(event.source.modified_at).format('YYYY-MM-DD hh:mm:ss');
                                }
                                if (event && event.source && event.source.content_created_at && event.source.content_modified_at) {
                                    event.source.content_created_at = moment(event.source.content_created_at).format('YYYY-MM-DD hh:mm:ss');
                                    event.source.content_modified_at = moment(event.source.content_modified_at).format('YYYY-MM-DD hh:mm:ss');
                                }
                                let uploadParams = {
                                    Bucket: AWSConfig.s3Bucket,
                                    Key: `events/${BoxConfig.enterpriseId}event${event.event_id}.json`,
                                    Body: JSON.stringify(event)
                                }
                                allEventsLoggedToS3.push(s3.upload(uploadParams).promise());
                                // fs.writeFileSync(`./events/${BoxConfig.enterpriseId}event${event.event_id}.json`, JSON.stringify(event));
                            });
                            return;
                        })
                        .then((uploadedEvents) => {
                            console.log("Loaded all event JSON to S3...");
                            console.log(uploadedEvents);
                        });
                });
            });
        });
}