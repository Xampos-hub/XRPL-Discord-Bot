import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('payment-channels')
        .setDescription('Manage XRPL payment channels for micropayments'),
    
    async execute(interaction) {
        const channelsEmbed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('💸 XRPL Payment Channels Hub')
            .setDescription('Manage payment channels for efficient micropayments')
            .addFields(
                { name: '📊 View My Channels', value: 'See all your active payment channels' },
                { name: '➕ Create New Channel', value: 'Set up a new payment channel' },
                { name: '💸 Send Micropayment', value: 'Send a small payment through an existing channel' },
                { name: '📈 Channel Analytics', value: 'View statistics about your payment channels' },
                { name: '🔄 Settle Channel', value: 'Close a channel and settle the final balance' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_channels')
                    .setLabel('View My Channels')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('create_channel')
                    .setLabel('Create New Channel')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('send_micropayment')
                    .setLabel('Send Micropayment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💸')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('channel_analytics')
                    .setLabel('Channel Analytics')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('settle_channel')
                    .setLabel('Settle Channel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄')
            );

        await interaction.reply({ 
            embeds: [channelsEmbed], 
            components: [row, row2]
        });
    }
};
