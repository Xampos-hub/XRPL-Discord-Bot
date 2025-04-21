import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cbdc-hub')
        .setDescription('Access CBDC tools and information on the XRPL'),
    
    async execute(interaction) {
        const cbdcEmbed = new EmbedBuilder()
            .setColor('#800080') // Purple color for CBDCs
            .setTitle('🏦 CBDC Integration Hub')
            .setDescription('Central Bank Digital Currency tools for the XRPL')
            .addFields(
                { name: '📊 CBDC Information', value: 'View details about CBDCs on the XRPL' },
                { name: '💰 CBDC Balance', value: 'Check your CBDC balances' },
                { name: '🔄 CBDC Swap', value: 'Exchange between CBDCs and other currencies' },
                { name: '📝 Compliance Tools', value: 'Navigate CBDC regulatory requirements' },
                { name: '⚡ CBDC Channels', value: 'Set up payment channels for CBDC micropayments' },
                { name: '📈 CBDC Analytics', value: 'View CBDC usage statistics and trends' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('cbdc_info')
                    .setLabel('CBDC Info')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('cbdc_balance')
                    .setLabel('Check Balance')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('cbdc_swap')
                    .setLabel('CBDC Swap')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('cbdc_compliance')
                    .setLabel('Compliance')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('cbdc_channels')
                    .setLabel('Payment Channels')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('cbdc_analytics')
                    .setLabel('Analytics')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈')
            );

        await interaction.reply({ 
            embeds: [cbdcEmbed], 
            components: [row, row2],
            ephemeral: true 
        });
    }
};
