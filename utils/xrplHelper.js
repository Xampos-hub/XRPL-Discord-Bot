const xrpl = require('xrpl');
const config = require('../config.json');

class XRPLHelper {
    constructor() {
        this.client = null;
    }

    async connect() {
        this.client = new xrpl.Client(config.xrplNetwork);
        
        // Add reconnect event handler
        this.client.on('reconnect', () => {
            console.log('XRPL client reconnecting...');
        });
        
        // Add error handler
        this.client.on('error', (error) => {
            console.error('XRPL client error:', error);
        });
        
        await this.client.connect();
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
        }
    }
}

module.exports = new XRPLHelper();
