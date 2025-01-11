import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function startWhaleUpdater(client, channelId) {
    const xrplClient = new xrpl.Client("wss://s1.ripple.com");
    await xrplClient.connect();

    xrplClient.request({
        command: "subscribe",
        streams: ["transactions"]
    });

    xrplClient.on('transaction', async (tx) => {
        try {
            if (tx.transaction.TransactionType === "Payment" && tx.transaction.Amount) {
                const amount = typeof tx.transaction.Amount === 'string' 
                    ? xrpl.dropsToXrp(tx.transaction.Amount)
                    : tx.transaction.Amount.value;

                if (amount >= 100000) { // Whale threshold: 100,000 XRP or equivalent
                    const whaleEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🐋 Whale Alert!')
                        .addFields(
                            { name: 'Amount', value: `${parseFloat(amount).toLocaleString()} XRP`, inline: true },
                            { name: 'From', value: tx.transaction.Account.slice(0, 8) + '...', inline: true },
                            { name: 'To', value: tx.transaction.Destination.slice(0, 8) + '...', inline: true },
                            { name: 'Transaction', value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${tx.transaction.hash})` }
                        )
                        .setTimestamp();

                    const channel = client.channels.cache.get(channelId);
                    if (channel) {
                        await channel.send({ embeds: [whaleEmbed] });
                    }
                }
            }
        } catch (error) {
            console.error('Whale alert error:', error);
        }
    });
}
