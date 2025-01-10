import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function handleTransactionHistory(interaction) {
    const txAddress = interaction.fields.getTextInputValue('tx_address_input');
    try {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        const response = await client.request({
            command: "account_tx",
            account: txAddress,
            limit: 5,
            binary: false
        });

        const txEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('💫 Transaction History')
            .setDescription(`Recent transactions for ${txAddress.substring(0, 12)}...`);

        if (response.result.transactions && response.result.transactions.length > 0) {
            response.result.transactions.forEach((tx) => {
                let details = '';
                
                // Check if transaction exists and has type
                if (tx && tx.tx) {
                    switch(tx.tx.TransactionType) {
                        case 'Payment':
                            details += '💸 Payment\n';
                            break;
                        case 'OfferCreate':
                            details += '📈 Offer Created\n';
                            break;
                        case 'OfferCancel':
                            details += '📉 Offer Cancelled\n';
                            break;
                        default:
                            details += '🔄 Other Transaction\n';
                    }
                    
                    if (tx.tx.Amount) {
                        const amount = typeof tx.tx.Amount === 'string' ? 
                            Number(tx.tx.Amount) / 1000000 : 
                            tx.tx.Amount.value;
                        details += `💰 Amount: ${amount} XRP\n`;
                    }
                    
                    if (tx.tx.Destination) {
                        details += `📤 To: ${tx.tx.Destination.substring(0, 12)}...`;
                    }

                    txEmbed.addFields({
                        name: `Transaction`,
                        value: `\`\`\`${details}\`\`\``
                    });
                }
            });
        } else {
            txEmbed.addFields({
                name: 'No Transactions',
                value: 'No recent transactions found'
            });
        }

        await interaction.reply({ embeds: [txEmbed], ephemeral: true });
        await client.disconnect();
    } catch (error) {
        console.log('Error details:', error);
        await interaction.reply({ 
            content: 'Error fetching transactions. Please verify the address and try again.', 
            ephemeral: true 
        });
    }
}