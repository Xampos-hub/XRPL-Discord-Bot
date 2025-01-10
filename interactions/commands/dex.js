import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dex')
        .setDescription('Access XRPL DEX trading features'),
    
    async execute(interaction) {
        const dexEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔄 XRPL DEX Trading')
            .setDescription('Select an option to start trading on the XRPL DEX')
            .addFields(
                { name: '💱 Quick Trade', value: 'Fast and simple trading interface' },
                { name: '📊 Order Book', value: 'View current market prices' },
                { name: '📝 My Orders', value: 'Manage your active orders' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_trade')
                    .setLabel('Quick Trade')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💱'),
                new ButtonBuilder()
                    .setCustomId('order_book')
                    .setLabel('Order Book')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('my_orders')
                    .setLabel('My Orders')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📝')
            );

        await interaction.reply({ embeds: [dexEmbed], components: [row], ephemeral: true });
    }
};
