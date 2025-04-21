import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';
import { showWalletSelector, getDecryptedWallet, getConnectedWallets } from './walletManager.js';

export default {
    async handleTrustLineManager(interaction) {
        const trustEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🤝 Trust Line Manager')
            .setDescription('Select an option to manage trust lines');

        const buttons = new ActionRowBuilder()
            .addComponents(
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
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('connect_wallet')
                    .setLabel('Connect Wallet')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔗')
            );

        await interaction.reply({
            embeds: [trustEmbed],
            components: [buttons],
            ephemeral: true
        });
    },

    async handleAddTrust(interaction) {
        try {
            const userId = interaction.user.id;
        
            // Import the wallet manager functions
            const { getConnectedWallets, showWalletSelector } = await import('./walletManager.js');
        
            const wallets = await getConnectedWallets(userId);
        
            if (!Array.isArray(wallets) || wallets.length === 0) {
                const noWalletsEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Connected Wallets')
                    .setDescription('You need to connect a wallet before you can add trust lines.')
                    .addFields(
                        { name: 'How to Connect', value: 'Use the "Connect Wallet" button to add your XRPL wallet.' }
                    );

                const connectButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('connect_wallet')
                            .setLabel('Connect Wallet')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🔗')
                    );

                await interaction.reply({
                    embeds: [noWalletsEmbed],
                    components: [connectButton],
                    ephemeral: true
                });
                return;
            }
        
            await showWalletSelector(interaction, 'add_trust');
        } catch (error) {
            console.error('Error in handleAddTrust:', error);
        
            // Send a user-friendly error message
            await interaction.reply({
                content: 'There was an error processing your request. Please try again later.',
                ephemeral: true
            });
        }
    },

    async handleRemoveTrust(interaction) {
        // Show wallet selector first
        const wallets = getConnectedWallets(interaction.user.id);
    
        if (wallets.length === 0) {
            const noWalletsEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Connected Wallets')
                .setDescription('You need to connect a wallet before you can remove trust lines.')
                .addFields(
                    { name: 'How to Connect', value: 'Use the "Connect Wallet" button to add your XRPL wallet.' }
                );

            const connectButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('connect_wallet')
                        .setLabel('Connect Wallet')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔗')
                );

            await interaction.reply({
                embeds: [noWalletsEmbed],
                components: [connectButton],
                ephemeral: true
            });
            return;
        }
        
        await showWalletSelector(interaction, 'remove_trust');
    },

    async handleModifyLimit(interaction) {
        // Show wallet selector first
        const wallets = getConnectedWallets(interaction.user.id);
    
        if (wallets.length === 0) {
            const noWalletsEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Connected Wallets')
                .setDescription('You need to connect a wallet before you can modify trust lines.')
                .addFields(
                    { name: 'How to Connect', value: 'Use the "Connect Wallet" button to add your XRPL wallet.' }
                );

            const connectButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('connect_wallet')
                        .setLabel('Connect Wallet')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔗')
                );

            await interaction.reply({
                embeds: [noWalletsEmbed],
                components: [connectButton],
                ephemeral: true
            });
            return;
        }
        
        await showWalletSelector(interaction, 'modify_limit');
    },

    async showAddTrustModal(interaction, address) {
        const modal = new ModalBuilder()
            .setCustomId(`add_trust_modal_${address}`)
            .setTitle('Add New Trust Line');

        const currencyInput = new TextInputBuilder()
            .setCustomId('currency_input')
            .setLabel('Currency Code')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter currency code (e.g., USD)')
            .setRequired(true);

        const issuerInput = new TextInputBuilder()
            .setCustomId('issuer_input')
            .setLabel('Issuer Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter issuer address')
            .setRequired(true);

        const limitInput = new TextInputBuilder()
            .setCustomId('limit_input')
            .setLabel('Trust Line Limit')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter limit amount')
            .setRequired(true);

        const rows = [
            new ActionRowBuilder().addComponents(currencyInput),
            new ActionRowBuilder().addComponents(issuerInput),
            new ActionRowBuilder().addComponents(limitInput)
        ];

        modal.addComponents(rows);
        await interaction.showModal(modal);
    },

    async showRemoveTrustModal(interaction, address) {
        const modal = new ModalBuilder()
            .setCustomId(`remove_trust_modal_${address}`)
            .setTitle('Remove Trust Line');

        const currencyInput = new TextInputBuilder()
            .setCustomId('currency_input')
            .setLabel('Currency Code')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter currency code (e.g., USD)')
            .setRequired(true);

        const issuerInput = new TextInputBuilder()
            .setCustomId('issuer_input')
            .setLabel('Issuer Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter issuer address')
            .setRequired(true);

        const rows = [
            new ActionRowBuilder().addComponents(currencyInput),
            new ActionRowBuilder().addComponents(issuerInput)
        ];

        modal.addComponents(rows);
        await interaction.showModal(modal);
    },
    
    async showModifyLimitModal(interaction, address) {
        const modal = new ModalBuilder()
            .setCustomId(`modify_limit_modal_${address}`)
            .setTitle('Modify Trust Line Limit');

        const currencyInput = new TextInputBuilder()
            .setCustomId('currency_input')
            .setLabel('Currency Code')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter currency code (e.g., USD)')
            .setRequired(true);

        const issuerInput = new TextInputBuilder()
            .setCustomId('issuer_input')
            .setLabel('Issuer Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter issuer address')
            .setRequired(true);

        const newLimitInput = new TextInputBuilder()
            .setCustomId('new_limit_input')
            .setLabel('New Limit')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter new limit amount')
            .setRequired(true);

        const rows = [
            new ActionRowBuilder().addComponents(currencyInput),
            new ActionRowBuilder().addComponents(issuerInput),
            new ActionRowBuilder().addComponents(newLimitInput)
        ];

        modal.addComponents(rows);
        await interaction.showModal(modal);
    },
    
    async handleTrustSetSubmit(interaction, address, action) {
        try {
            // Get the wallet from the user's connected wallets
            const wallet = getDecryptedWallet(interaction.user.id, address);
            
            if (!wallet) {
                return await interaction.reply({
                    content: '❌ Wallet not found or access denied. Please reconnect your wallet.',
                    ephemeral: true
                });
            }
            
            const client = new xrpl.Client("wss://s1.ripple.com");
            await client.connect();

            const currency = interaction.fields.getTextInputValue('currency_input');
            const issuer = interaction.fields.getTextInputValue('issuer_input');
            let limit = "0";

            if (action === 'add_trust') {
                limit = interaction.fields.getTextInputValue('limit_input');
            } else if (action === 'modify_limit') {
                limit = interaction.fields.getTextInputValue('new_limit_input');
            }
            // For remove_trust, limit remains "0"

            const trustSet = {
                TransactionType: "TrustSet",
                Account: address,
                LimitAmount: {
                    currency: currency,
                    issuer: issuer,
                    value: limit
                }
            };

            const prepared = await client.autofill(trustSet);
            const signed = wallet.sign(prepared);
            const response = await client.submitAndWait(signed.tx_blob);

            let title, color;
            if (action === 'add_trust') {
                title = '✅ Trust Line Added';
                color = '#00ff00';
            } else if (action === 'remove_trust') {
                title = '🔄 Trust Line Removed';
                color = '#ff0000';
            } else {
                title = '📝 Trust Line Modified';
                color = '#0099ff';
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .addFields(
                    { name: 'Currency', value: currency },
                    { name: 'Issuer', value: issuer },
                    { name: 'Status', value: response.result.meta.TransactionResult },
                    { name: 'Transaction', value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${signed.hash})` }
                );

            await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
        } catch (error) {
            console.error('Trust line operation error:', error);
            await interaction.reply({
                content: `❌ Error processing trust line: ${error.message}`,
                ephemeral: true
            });
        }
    },
    
    async handleWalletSelection(interaction) {
        // Extract the action type and address from the customId
        // Format: select_wallet_ACTION_ADDRESS
        const parts = interaction.customId.split('_');
        const action = parts[2]; // add_trust, remove_trust, or modify_limit
        const address = parts.slice(3).join('_'); // Rejoin in case address contains underscores
        
        switch (action) {
            case 'add_trust':
                await this.showAddTrustModal(interaction, address);
                break;
            case 'remove_trust':
                await this.showRemoveTrustModal(interaction, address);
                break;
            case 'modify_limit':
                await this.showModifyLimitModal(interaction, address);
                break;
            default:
                await interaction.reply({
                    content: '❌ Unknown action type.',
                    ephemeral: true
                });
        }
    },
    
    async handleTrustModalSubmit(interaction) {
        // Extract the action type and address from the customId
        // Format: ACTION_trust_modal_ADDRESS
        const parts = interaction.customId.split('_');
        const action = parts[0]; // add, remove, or modify
        const address = parts.slice(3).join('_'); // Rejoin in case address contains underscores
        
        await this.handleTrustSetSubmit(interaction, address, `${action}_trust`);
    }
};
