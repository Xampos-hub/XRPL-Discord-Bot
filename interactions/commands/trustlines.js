import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('trustlines')
        .setDescription('Manage your XRPL trust lines'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🤝 Trust Line Manager')
            .setDescription('Manage your XRPL token trust lines')
            .addFields(
                { name: '➕ Add Trust Line', value: 'Create new trust lines for tokens' },
                { name: '➖ Remove Trust Line', value: 'Remove existing trust lines' },
                { name: '📝 Modify Limits', value: 'Adjust trust line limits' },
                { name: '👀 View Trust Lines', value: 'Check your current trust lines' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_trust_lines')
                    .setLabel('View Trust Lines')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👀'),
                new ButtonBuilder()
                    .setCustomId('add_trust')
                    .setLabel('Add Trust Line')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('remove_trust')
                    .setLabel('Remove Trust Line')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖'),
                new ButtonBuilder()
                    .setCustomId('modify_limit')
                    .setLabel('Modify Limit')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
