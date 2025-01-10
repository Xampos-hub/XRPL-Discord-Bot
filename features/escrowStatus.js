import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

function rippleTimeToUnix(rippleTime) {
    return (rippleTime + 946684800) * 1000;
}

export async function handleEscrowStatus(interaction) {
    const escrowAddress = interaction.fields.getTextInputValue('escrow_address_input');
    try {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        const response = await client.request({
            command: "account_objects",
            account: escrowAddress,
            type: "escrow"
        });

        const escrowEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔒 Escrow Status')
            .setDescription(`Active escrows for ${escrowAddress.substring(0, 12)}...`);

        if (response.result.account_objects.length === 0) {
            escrowEmbed.addFields({
                name: '\u200B',
                value: '❌ No active escrows found'
            });
        } else {
            response.result.account_objects.forEach((escrow, index) => {
                let details = '';
                details += `💰 Amount: ${xrpl.dropsToXrp(escrow.Amount)} XRP\n`;
                details += `📤 To: ${escrow.Destination.substring(0, 12)}...\n`;
                if (escrow.FinishAfter) {
                    const date = new Date(rippleTimeToUnix(escrow.FinishAfter));
                    details += `⏰ Finish After: ${date.toLocaleString()}`;
                }
                
                escrowEmbed.addFields({
                    name: `Escrow ${index + 1}`,
                    value: `\`\`\`${details}\`\`\``
                });
            });
        }

        await interaction.reply({ embeds: [escrowEmbed], ephemeral: true });
        await client.disconnect();
    } catch (error) {
        await interaction.reply({ 
            content: 'Error fetching escrow data: Invalid address or network error', 
            ephemeral: true 
        });
    }
}