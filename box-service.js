'use strict';
const fs = require('fs');
const path = require('path');
const Box = require('box-node-sdk');
const BoxUtilityServices = require('./box-utils');
const BoxAutoPageUtilities = require('./box-autopageAsync');
const Promise = require('bluebird');
const asyncFunc = Promise.coroutine;
const BOX_ENTERPRISE = "enterprise";
const BOX_USER = "user";

class BoxClientService {
    constructor() {
        this.BoxSdk = new Box({
            clientID: process.env.BOX_CLIENT_ID,
            clientSecret: process.env.BOX_CLIENT_SECRET,
            appAuth: {
                keyID: process.env.BOX_PUBLIC_KEY_ID,
                privateKey: (() => {
                    return fs.readFileSync(path.resolve(process.env.BOX_PRIVATE_KEY_FILENAME));
                })(),
                passphrase: process.env.BOX_PRIVATE_KEY_PASSWORD
            }
        });
    }

    getServiceAccountClient() {
        return BoxUtilityServices.promisifyClient(this.BoxSdk.getAppAuthClient(BOX_ENTERPRISE, process.env.BOX_ENTERPRISE_ID));
    }

    getUserAccountClient(boxId) {
        return BoxUtilityServices.promisifyClient(this.BoxSdk.getAppAuthClient(BOX_USER, boxId));
    }

    autoPageWithStreamUsingServiceAccount(manager, methodName, id, options) {
        return BoxAutoPageUtilities.autoPageWithStreamAsync(this.getServiceAccountClient(), manager, methodName, id, options);
    }

    autoPageWithStreamUsingUserAccount(boxId, manager, methodName, id, options) {
        return BoxAutoPageUtilities.autoPageWithStreamAsync(this.getUserAccountClient(boxId), manager, methodName, id, options);
    }
}

module.exports = new BoxClientService();