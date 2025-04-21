import { SlashCommandBuilder } from '@discordjs/builders';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { createInformationChannels } from '../../features/channelManager.js';
import { startPriceUpdater } from '../../features/priceUpdater.js';
import { startVolumeUpdater } from '../../features/volumeUpdater.js';
import { startWhaleUpdater } from '../../features/whaleUpdater.js';
import { startNFTUpdater } from '../../features/nftActivityUpdater.js';
import { startAMMUpdater } from '../../features/ammUpdater.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-channels')
        .setDescription('Create auto-updating XRPL information channels'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const existingCategory = interaction.guild.channels.cache.find(c => c.name === '📊 XRPL Market Data' && c.type === ChannelType.GuildCategory);
            
            let category;
            if (existingCategory) {
                category = existingCategory;
            } else {
                category = await createInformationChannels(interaction.guild);
            }

            // Define all required channels
            const requiredChannels = {
                'xrp-price': '💰',
                'trading-volume': '📈',
                'whale-alerts': '🐋',
                'nft-activity': '🎨',
                'amm-analytics': '🏊'
            };

            // Check and create missing channels
            for (const [channelName, emoji] of Object.entries(requiredChannels)) {
                const existingChannel = category.children.cache.find(c => c.name.includes(channelName));
                if (!existingChannel) {
                    await interaction.guild.channels.create({
                        name: `${emoji}│${channelName}`,
                        type: ChannelType.GuildText,
                        parent: category.id,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone,
                                deny: [PermissionFlagsBits.SendMessages],
                            }
                        ]
                    });
                }
            }

            // Get all channel IDs (both existing and new)
            const channels = {
                priceChannelId: category.children.cache.find(c => c.name.includes('xrp-price'))?.id,
                volumeChannelId: category.children.cache.find(c => c.name.includes('trading-volume'))?.id,
                whaleChannelId: category.children.cache.find(c => c.name.includes('whale-alerts'))?.id,
                nftChannelId: category.children.cache.find(c => c.name.includes('nft-activity'))?.id,
                ammChannelId: category.children.cache.find(c => c.name.includes('amm-analytics'))?.id
            };

            // Start all updaters
            if (channels.priceChannelId) startPriceUpdater(interaction.client, channels.priceChannelId);
            if (channels.volumeChannelId) startVolumeUpdater(interaction.client, channels.volumeChannelId);
            if (channels.whaleChannelId) startWhaleUpdater(interaction.client, channels.whaleChannelId);
            if (channels.nftChannelId) startNFTUpdater(interaction.client, channels.nftChannelId);
            if (channels.ammChannelId) startAMMUpdater(interaction.client, channels.ammChannelId);

            await interaction.editReply({
                content: 'XRPL information channels have been updated and all feeds are running!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Setup error:', error);
            await interaction.editReply({
                content: 'Error setting up channels. Please check bot permissions.',
                ephemeral: true
            });
        }
    }
};