import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function startWhaleUpdater(client, channelId) {
    const xrplClient = new xrpl.Client("wss://s1.ripple.com");
    await xrplClient.connect();

    console.log('Whale alert monitoring started');
    
    // Track the number of alerts for periodic reporting
    let alertCount = 0;
    const reportInterval = 100; // Report every 100 alerts

    xrplClient.request({
        command: "subscribe",
        streams: ["transactions"]
    });

    xrplClient.on('transaction', async (tx) => {
        try {
            // First, check if it's a Payment transaction
            if (tx.transaction.TransactionType === "Payment" && tx.transaction.Amount) {
                // Parse the amount correctly
                let amount, currency;
                
                if (typeof tx.transaction.Amount === 'string') {
                    // This is an XRP payment
                    amount = xrpl.dropsToXrp(tx.transaction.Amount);
                    currency = 'XRP';
                } else {
                    // This is a token payment
                    amount = tx.transaction.Amount.value;
                    
                    // Try to decode the currency code from hex if needed
                    try {
                        if (tx.transaction.Amount.currency.length === 40) {
                            const decoded = Buffer.from(tx.transaction.Amount.currency, 'hex')
                                .toString('utf8')
                                .replace(/\0/g, '');
                            currency = decoded || tx.transaction.Amount.currency;
                        } else {
                            currency = tx.transaction.Amount.currency;
                        }
                    } catch (e) {
                        currency = tx.transaction.Amount.currency;
                    }
                }

                // Only process large transactions (whale threshold)
                // For XRP, use 100,000 as threshold
                // For tokens, use 1,000,000 as threshold (adjust as needed)
                const isWhale = (currency === 'XRP' && parseFloat(amount) >= 100000) || 
                               (currency !== 'XRP' && parseFloat(amount) >= 1000000);
                
                if (isWhale) {
                    // Increment alert count but only log periodically
                    alertCount++;
                    if (alertCount % reportInterval === 0) {
                        console.log(`Processed ${alertCount} whale alerts so far`);
                    }
                    
                    // Format the amount for display
                    let displayAmount;
                    if (amount.includes('e')) {
                        // Handle scientific notation
                        displayAmount = parseFloat(amount).toLocaleString();
                    } else {
                        displayAmount = parseFloat(amount).toLocaleString();
                    }
                    
                    // Check if this is a self-transfer (same sender and receiver)
                    const isSelfTransfer = tx.transaction.Account === tx.transaction.Destination;
                    
                    // Create the embed with appropriate information
                    const whaleEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🐋 Whale Alert!')
                        .addFields(
                            { 
                                name: 'Amount', 
                                value: `${displayAmount} ${currency}`, 
                                inline: true 
                            },
                            { 
                                name: 'From', 
                                value: tx.transaction.Account.slice(0, 8) + '...', 
                                inline: true 
                            },
                            { 
                                name: 'To', 
                                value: tx.transaction.Destination.slice(0, 8) + '...', 
                                inline: true 
                            }
                        )
                        .setTimestamp();
                    
                    // Add transaction link
                    whaleEmbed.addFields({
                        name: 'Transaction',
                        value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${tx.transaction.hash})`
                    });
                    
                    // Add note if it's a self-transfer
                    if (isSelfTransfer) {
                        whaleEmbed.addFields({
                            name: 'Note',
                            value: '⚠️ This is a self-transfer (same sender and receiver)'
                        });
                    }
                    
                    // Add issuer information for tokens
                    if (currency !== 'XRP' && tx.transaction.Amount.issuer) {
                        whaleEmbed.addFields({
                            name: 'Token Issuer',
                            value: tx.transaction.Amount.issuer.slice(0, 8) + '...'
                        });
                    }

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
