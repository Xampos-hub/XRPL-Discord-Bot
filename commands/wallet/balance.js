const xrplHelper = require('../../utils/xrplHelper');

module.exports = {
    name: 'balance',
    description: 'Check XRP balance for an address',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('Please provide an XRP address!');
        }

        const address = args[0];

        try {
            await xrplHelper.connect();
            const response = await xrplHelper.client.request({
                command: 'account_info',
                account: address
            });

            const balance = xrpl.dropsToXrp(response.result.account_data.Balance);
            
            message.reply(`Balance for ${address}:\n${balance} XRP`);
        } catch (error) {
            message.reply('Error fetching balance: ' + error.message);
        } finally {
            await xrplHelper.disconnect();
        }
    }
};
