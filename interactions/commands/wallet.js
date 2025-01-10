import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Access XRPL wallet features'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('XRPL Wallet Features')
            .setDescription('Select an option below to interact with XRPL wallets')
            .addFields(
                { name: '💰 Check Balance', value: 'View XRP and token balances' },
                { name: '📜 Transaction History', value: 'View recent transactions' },
                { name: '🔍 Transaction Decoder', value: 'Decode and explain transactions' },
                { name: '🔒 Escrow Status', value: 'Monitor escrow agreements' },
                { name: '🎨 NFT Holdings', value: 'View NFT collection' },
                { name: '🤝 Trust Lines', value: 'Manage token trust lines' }
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('check_balance')
                    .setLabel('Check Balance')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('transaction_history')
                    .setLabel('Transaction History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setCustomId('decode_transaction')
                    .setLabel('Decode TX')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('escrow_status')
                    .setLabel('Escrow Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔒')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_wallet')
                    .setLabel('Create Wallet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔐'),
                new ButtonBuilder()
                    .setCustomId('nft_holdings')
                    .setLabel('NFT Holdings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎨'),
                new ButtonBuilder()
                    .setCustomId('view_trust_lines')
                    .setLabel('Trust Lines')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤝')
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2] 
        });
    }
};