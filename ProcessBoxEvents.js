'use strict';
const moment = require('moment');
const _ = require('lodash');
const AWS = require('./aws-service');
const Promise = require('bluebird');
const asyncFunc = Promise.coroutine;
let s3 = AWS.getS3Client();
let dynamo = AWS.getDynamoClient();

exports.handler = (event, context, callback) => {
    return asyncFunc(function* () {
        let allEvents = processRecords(event.Records);
        let allEventsLoggedToS3 = [];
        let updatedDynamoWithEvents = [];
        _.each(allEvents, (event) => {
            let dynamoGetParams = {
                TableName: process.env.BOX_EVENT_TABLE_NAME,
                Key: {
                    id: `${process.env.BOX_ENTERPRISE_ID}event${event.event_id}`
                }
            }
            let processedEvent = yield dynamo.get(dynamoGetParams).promise();
            if (_.isEmpty(processedEvent) || !processedEvent.Item || !processedEvent.Item.sentToS3) {
                console.log("Adding event...");
                formatDateForAthena(event);
                let uploadParams = {
                    Bucket: process.env.BOX_EVENT_S3_BUCKET,
                    Key: `events/${process.env.BOX_ENTERPRISE_ID}event${event.event_id}.json`,
                    Body: JSON.stringify(event)
                }
                allEventsLoggedToS3.push(s3.upload(uploadParams).promise());

                let item = {
                    id: `${process.env.BOX_ENTERPRISE_ID}event${event.event_id}`,
                    sentToS3: true
                }
                let dynamoPutParams = {
                    TableName: process.env.BOX_EVENT_TABLE_NAME,
                    Item: item
                }
                let updated = updatedDynamoWithEvents.push(dynamo.put(dynamoPutParams).promise());
            }
        });

        yield Promise.all(allEventsLoggedToS3);
        yield Promise.all(updatedDynamoWithEvents);
        console.log("Processed events...");
        callback(null, 'Finished processing...');
    })();
}

function processRecords(records) {
    let allEvents = [];
    let addedNewEvents = [];
    _.forEach(records, (record) => {
        allEvents.push(JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString('ascii')));
    });
    allEvents = _.uniqBy(allEvents, "event_id");
    return allEvents;
}

function formatDateForAthena(event) {
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
    return event;
}