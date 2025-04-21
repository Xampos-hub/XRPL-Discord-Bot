import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('security-hub')
        .setDescription('Deploy a security hub with tools to protect your XRPL assets'),
    
    async execute(interaction) {
        // Create the main security hub embed
        const securityEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🛡️ XRPL Security Hub')
            .setDescription('Protect your assets with these security tools')
            .addFields(
                { name: '🔍 Phishing Protection', value: 'Check addresses and links for known scams' },
                { name: '🔐 Transaction Verification', value: 'Verify transactions before signing them' },
                { name: '📊 Security Audit', value: 'Check your wallet settings for security best practices' },
                { name: '⚠️ Suspicious Activity Monitor', value: 'Set up alerts for unusual wallet activity' },
                { name: '🤝 Trustline Safety', value: 'Evaluate the safety of adding trustlines' }
            )
            .setFooter({ text: 'Stay safe in the XRPL ecosystem' });

        // Create the first row of buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('phishing_check')
                    .setLabel('Phishing Check')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('verify_transaction')
                    .setLabel('Verify Transaction')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔐'),
                new ButtonBuilder()
                    .setCustomId('security_audit')
                    .setLabel('Security Audit')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📊')
            );

        // Create the second row of buttons
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('activity_monitor')
                    .setLabel('Activity Monitor')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId('trustline_safety')
                    .setLabel('Trustline Safety')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🤝'),
                new ButtonBuilder()
                    .setCustomId('security_resources')
                    .setLabel('Security Resources')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚')
            );

        // Send the security hub message
        await interaction.reply({ 
            embeds: [securityEmbed], 
            components: [row1, row2]
        });
    }
};
