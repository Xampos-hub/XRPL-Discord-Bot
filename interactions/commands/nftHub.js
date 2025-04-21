import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nft-hub')
        .setDescription('Access NFT tools and analytics for the XRPL'),
    
    async execute(interaction) {
        const nftEmbed = new EmbedBuilder()
            .setColor('#FF6B6B') // A nice color for NFTs
            .setTitle('🎨 XRPL NFT Hub')
            .setDescription('Analyze, value, and explore NFTs on the XRP Ledger')
            .addFields(
                { name: '🔍 NFT Lookup', value: 'View details about specific NFTs by TokenID' },
                { name: '💰 Rarity & Valuation', value: 'Calculate rarity scores and estimated values' },
                { name: '📊 Collection Analysis', value: 'Analyze entire NFT collections for trends and statistics' },
                { name: '💼 Portfolio Valuation', value: 'Value all NFTs in an XRPL wallet' },
                { name: '🏆 Rarity Comparison', value: 'Compare rarity and value between multiple NFTs' },
                { name: '📈 Market Trends', value: 'View market trends for popular NFT collections' }
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('nft_lookup')
                    .setLabel('NFT Lookup')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('nft_rarity')
                    .setLabel('Rarity & Value')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('nft_collection')
                    .setLabel('Collection Analysis')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('nft_portfolio')
                    .setLabel('Portfolio Valuation')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💼'),
                new ButtonBuilder()
                    .setCustomId('nft_compare')
                    .setLabel('Compare NFTs')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('nft_market')
                    .setLabel('Market Trends')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈')
            );

        await interaction.reply({ 
            embeds: [nftEmbed], 
            components: [row1, row2] 
        });
    }
};