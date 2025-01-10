import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function handleCheckBalance(interaction) {
    const address = interaction.fields.getTextInputValue('address_input');
    try {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        const accountInfo = await client.request({
            command: "account_info",
            account: address,
            ledger_index: "validated"
        });

        const accountLines = await client.request({
            command: "account_lines",
            account: address
        });

        const balanceEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Wallet Balance')
            .setDescription(`Balance information for ${address}`)
            .addFields(
                { name: 'XRP Balance', value: `${xrpl.dropsToXrp(accountInfo.result.account_data.Balance)} XRP` }
            );

        if (accountLines.result.lines.length > 0) {
            accountLines.result.lines.forEach(line => {
                let formattedBalance = line.balance;
                let tokenName = line.currency;
                
                if (tokenName.length === 40) {
                    try {
                        tokenName = Buffer.from(tokenName, 'hex').toString('utf-8').replace(/\0/g, '');
                    } catch (e) {
                        tokenName = line.currency;
                    }
                }
                
                const num = parseFloat(formattedBalance);
                if (Math.abs(num) < 1 && num !== 0) {
                    formattedBalance = num.toFixed(8);
                } else {
                    formattedBalance = num.toFixed(2);
                }
                
                formattedBalance = formattedBalance.replace(/\.?0+$/, '');
                
                balanceEmbed.addFields({
                    name: `${tokenName}`,
                    value: `${formattedBalance} ${tokenName}\nIssuer: ${line.account.substring(0, 12)}...`
                });
            });
        }

        await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
        await client.disconnect();
    } catch (error) {
        await interaction.reply({ 
            content: 'Error fetching balance: Invalid address or network error', 
            ephemeral: true 
        });
    }
}