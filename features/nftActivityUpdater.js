import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function startNFTUpdater(client, channelId) {
    const xrplClient = new xrpl.Client("wss://s1.ripple.com");
    await xrplClient.connect();

    // Subscribe to NFT transactions
    xrplClient.request({
        command: "subscribe",
        streams: ["transactions"]
    });

    xrplClient.on('transaction', async (tx) => {
        try {
            if (tx.transaction.TransactionType === "NFTokenMint" || 
                tx.transaction.TransactionType === "NFTokenCreateOffer" ||
                tx.transaction.TransactionType === "NFTokenAcceptOffer") {

                const nftEmbed = new EmbedBuilder()
                    .setColor('#ff00ff')
                    .setTitle('🎨 NFT Activity')
                    .setTimestamp();

                switch(tx.transaction.TransactionType) {
                    case "NFTokenMint":
                        nftEmbed
                            .setDescription('New NFT Minted!')
                            .addFields(
                                { name: 'Minter', value: tx.transaction.Account.slice(0, 8) + '...', inline: true },
                                { name: 'URI', value: tx.transaction.URI ? Buffer.from(tx.transaction.URI, 'hex').toString() : 'No URI', inline: true },
                                { name: 'Transfer Fee', value: tx.transaction.TransferFee ? `${tx.transaction.TransferFee/1000}%` : '0%', inline: true }
                            );
                        break;
                    case "NFTokenCreateOffer":
                        nftEmbed
                            .setDescription('NFT Listed for Sale!')
                            .addFields(
                                { name: 'Seller', value: tx.transaction.Account.slice(0, 8) + '...', inline: true },
                                { name: 'Price', value: tx.transaction.Amount ? `${xrpl.dropsToXrp(tx.transaction.Amount)} XRP` : 'Not specified', inline: true }
                            );
                        break;
                    case "NFTokenAcceptOffer":
                        nftEmbed
                            .setDescription('NFT Sold!')
                            .addFields(
                                { name: 'Buyer', value: tx.transaction.Account.slice(0, 8) + '...', inline: true },
                                { name: 'Offer ID', value: tx.transaction.NFTokenSellOffer || tx.transaction.NFTokenBuyOffer, inline: true }
                            );
                        break;
                }

                nftEmbed.addFields({
                    name: 'Transaction',
                    value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${tx.transaction.hash})`
                });

                const channel = client.channels.cache.get(channelId);
                if (channel) {
                    await channel.send({ embeds: [nftEmbed] });
                }
            }
        } catch (error) {
            console.error('NFT update error:', error);
        }
    });
}
