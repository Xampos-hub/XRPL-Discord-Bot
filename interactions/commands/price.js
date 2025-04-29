import { SlashCommandBuilder } from '@discordjs/builders';
import { EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('price')
    .setDescription('Get XRP token price');

export async function execute(interaction) {
    await interaction.deferReply();
    
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT');
        const data = await response.json();
        const price = parseFloat(data.price);
        
        const embed = new EmbedBuilder()
            .setTitle('🚀 XRP Token Price')
            .setColor('#00ff00')
            .addFields(
                { name: '💎 Price', value: `${price.toFixed(6)} USDT`, inline: true },
                { name: '📊 Market', value: 'Binance', inline: true },
                { name: '🔄 Status', value: 'Live Price', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Real-time data from Binance' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Price fetch error:', error);
        await interaction.editReply('Error fetching price data. Please try again.');
    }
}

// Add default export to fix the deployment error
export default { data, execute };