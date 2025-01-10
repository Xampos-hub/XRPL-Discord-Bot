const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const xrpl = require('xrpl');

module.exports = {
    async handleButton(interaction) {
        switch (interaction.customId) {
            case 'create_wallet':
                try {
                    const wallet = xrpl.Wallet.generate();
                    
                    const walletEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🔐 New XRPL Wallet Created')
                        .setDescription('Your wallet has been created successfully!')
                        .addFields(
                            { name: '📬 Public Address', value: `\`${wallet.address}\`` },
                            { name: '🔑 Family Seed', value: '||`' + wallet.seed + '`||' },
                            { name: '⚠️ Important Security Notes', value: 
                                '• Save your seed in a secure location\n' +
                                '• Never share your seed with anyone\n' +
                                '• Require minimum 10 XRP to activate\n' +
                                '• Backup your wallet information' 
                            }
                        )
                        .setTimestamp();

                    await interaction.user.send({ embeds: [walletEmbed] });
                    await interaction.reply({ 
                        content: '✅ Wallet created! Check your DMs for secure wallet information.', 
                        ephemeral: true 
                    });
                } catch (error) {
                    await interaction.reply({ 
                        content: 'Error creating wallet. Please try again.', 
                        ephemeral: true 
                    });
                }
                break;

            case 'check_balance':
                const balanceModal = new ModalBuilder()
                    .setCustomId('balance_modal')
                    .setTitle('Check Wallet Balance');

                const addressInput = new TextInputBuilder()
                    .setCustomId('address_input')
                    .setLabel('Enter XRPL Address')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(addressInput);
                balanceModal.addComponents(firstActionRow);
                await interaction.showModal(balanceModal);
                break;

            case 'transaction_history':
                const txModal = new ModalBuilder()
                    .setCustomId('tx_modal')
                    .setTitle('View Transaction History');

                const txAddressInput = new TextInputBuilder()
                    .setCustomId('tx_address_input')
                    .setLabel('Enter XRPL Address')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                    .setRequired(true);

                const txActionRow = new ActionRowBuilder().addComponents(txAddressInput);
                txModal.addComponents(txActionRow);
                await interaction.showModal(txModal);
                break;

            case 'escrow_status':
                const escrowModal = new ModalBuilder()
                    .setCustomId('escrow_modal')
                    .setTitle('Check Escrow Status');

                const escrowAddressInput = new TextInputBuilder()
                    .setCustomId('escrow_address_input')
                    .setLabel('Enter XRPL Address')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                    .setRequired(true);

                const escrowActionRow = new ActionRowBuilder().addComponents(escrowAddressInput);
                escrowModal.addComponents(escrowActionRow);
                await interaction.showModal(escrowModal);
                break;

            case 'nft_holdings':
                const nftModal = new ModalBuilder()
                    .setCustomId('nft_modal')
                    .setTitle('View NFT Holdings');

                const nftAddressInput = new TextInputBuilder()
                    .setCustomId('nft_address_input')
                    .setLabel('Enter XRPL Address')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                    .setRequired(true);

                const nftActionRow = new ActionRowBuilder().addComponents(nftAddressInput);
                nftModal.addComponents(nftActionRow);
                await interaction.showModal(nftModal);
                break;

            case 'view_trust_lines':
                const trustEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🤝 Trust Line Manager')
                    .setDescription('Manage your XRPL token trust lines');

                const trustButtons = new ActionRowBuilder()
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
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📝')
                    );

                await interaction.reply({
                    embeds: [trustEmbed],
                    components: [trustButtons],
                    ephemeral: true
                });
                break;

            case 'add_trust':
                const addTrustModal = new ModalBuilder()
                    .setCustomId('add_trust_modal')
                    .setTitle('Add New Trust Line');

                const currencyInput = new TextInputBuilder()
                    .setCustomId('currency_input')
                    .setLabel('Currency Code')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the transaction hash to decode')
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

                addTrustModal.addComponents(
                    new ActionRowBuilder().addComponents(currencyInput),
                    new ActionRowBuilder().addComponents(issuerInput),
                    new ActionRowBuilder().addComponents(limitInput)
                );

                await interaction.showModal(addTrustModal);
                break;
        }
    }
};