import { SlashCommandBuilder } from '@discordjs/builders';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { startNewsUpdater } from '../../features/newsUpdater.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-news')
        .setDescription('Starts news updates in existing XRPL news channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;
        const category = guild.channels.cache.find(c => c.name === "XRPL NEWS" && c.type === ChannelType.GuildCategory);
        
        if (!category) {
            return interaction.reply({
                content: '❌ XRPL NEWS category not found. Please create the category and channels first.',
                ephemeral: true
            });
        }

        const newsChannel = category.children.cache.find(channel => channel.name === '📰│xrpl-news');
        const fearGreedChannel = category.children.cache.find(channel => channel.name === '🎯│market-sentiment');

        if (!newsChannel || !fearGreedChannel) {
            return interaction.reply({
                content: '❌ Required channels not found in XRPL NEWS category.',
                ephemeral: true
            });
        }

        startNewsUpdater(interaction.client, newsChannel.id, fearGreedChannel.id);

        await interaction.reply({
            content: '✅ News updates have been activated in the existing channels!',
            ephemeral: true
        });
    }
};