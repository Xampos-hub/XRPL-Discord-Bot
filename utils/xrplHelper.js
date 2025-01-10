const xrpl = require('xrpl');
const config = require('../config.json');

class XRPLHelper {
    constructor() {
        this.client = null;
    }

    async connect() {
        this.client = new xrpl.Client(config.xrplNetwork);
        await this.client.connect();
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
        }
    }
}

module.exports = new XRPLHelper();
