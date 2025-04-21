import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import xrpl from 'xrpl';

function getTransactionTypeExplanation(type) {
    const explanations = {
        'Payment': '💸 A direct transfer of XRP or tokens between wallets',
        'OfferCreate': '📈 Creating a new trade offer on the DEX',
        'OfferCancel': '❌ Canceling an existing trade offer',
        'TrustSet': '🤝 Setting up trust for a token',
        'NFTokenMint': '🎨 Creating a new NFT',
        'NFTokenBurn': '🔥 Destroying an NFT',
        'AccountSet': '⚙️ Changing account settings'
    };
    return explanations[type] || '🔄 Other transaction type';
}

export async function handleTransactionDecode(interaction) {
    const txHash = interaction.fields.getTextInputValue('tx_hash_input');
    
    try {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        const tx = await client.request({
            command: "tx",
            transaction: txHash
        });

        const decodedEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔍 Transaction Decoder')
            .addFields(
                { name: 'Transaction Type', value: `${tx.result.TransactionType}\n${getTransactionTypeExplanation(tx.result.TransactionType)}` },
                { name: 'Status', value: tx.result.validated ? '✅ Confirmed' : '⏳ Pending' },
                { name: 'From', value: `\`${tx.result.Account}\`` },
                { name: 'Fee Paid', value: `${xrpl.dropsToXrp(tx.result.Fee)} XRP` }
            );

        // Add specific fields based on transaction type
        if (tx.result.TransactionType === 'Payment') {
            decodedEmbed.addFields(
                { name: 'To', value: `\`${tx.result.Destination}\`` },
                { name: 'Amount', value: `${xrpl.dropsToXrp(tx.result.Amount)} XRP` },
                { name: 'What happened?', value: 
                    '\n' +
                    '# This transaction:\n' +
                    `* Sent ${xrpl.dropsToXrp(tx.result.Amount)} XRP\n` +
                    `* From one wallet to another\n` +
                    `* Paid ${xrpl.dropsToXrp(tx.result.Fee)} XRP in fees\n` +
                    ''
                }
            );
        }

        await interaction.reply({ 
            embeds: [decodedEmbed], 
            ephemeral: true 
        });

        await client.disconnect();
    } catch (error) {
        await interaction.reply({ 
            content: 'Could not decode this transaction. Please verify the transaction hash.', 
            ephemeral: true 
        });
    }
}
