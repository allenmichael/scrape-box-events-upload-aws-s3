'use strict';
const moment = require('moment');
const _ = require('lodash');
const Box = require('./box-service');
const AWS = require('./aws-service');
const Promise = require('bluebird');
const asyncFunc = Promise.coroutine;
let kinesis = AWS.getKinesisClient();

exports.handler = (event, context, callback) => {
    asyncFunc(function* () {
        let createdBefore = moment().format();
        let createdAfter = moment().subtract(process.env.BOX_POLL_INTERVAL.toString(), process.env.BOX_POLL_TIME_MEASUREMENT.toString()).format();
        let events = yield Box.autoPageWithStreamUsingServiceAccount("events", "getAsync", null, { limit: 500, stream_type: "admin_logs", created_before: createdBefore, created_after: createdAfter });
        let chunkedEvents = _.chunk(events, 500);
        let addedNewEventsAsync = [];
        _.each(chunkedEvents, (events) => {
            let records = [];
            _.each(events, (event) => {
                records.push({
                    Data: JSON.stringify(event),
                    PartitionKey: `events/${process.env.BOX_ENTERPRISE_ID}event${event.event_id}`
                });
            });
            return asyncFunc(function* () {
                let addedRecord = {
                    Records: records,
                    StreamName: process.env.BOX_EVENT_KINESIS_STREAM
                }
                addedNewEventsAsync.push(kinesis.putRecords(addedRecord).promise());
            })();
        });
        yield Promise.all(addedNewEventsAsync);
        console.log("Processed events...");
        callback(null, 'Finished processing...');
    })();
}