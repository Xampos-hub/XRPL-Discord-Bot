import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export default {    async handleTrustLineManager(interaction) {
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
                    .setEmoji('📝')
            );

        await interaction.reply({
            embeds: [trustEmbed],
            components: [buttons],
            ephemeral: true
        });
    },

    async handleAddTrust(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('add_trust_modal')
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

    async handleRemoveTrust(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('remove_trust_modal')
            .setTitle('Remove Trust Line');

        const currencyInput = new TextInputBuilder()
            .setCustomId('currency_input')
            .setLabel('Currency Code')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter currency code to remove')
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

    async handleModifyLimit(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('modify_limit_modal')
            .setTitle('Modify Trust Line Limit');

        const currencyInput = new TextInputBuilder()
            .setCustomId('currency_input')
            .setLabel('Currency Code')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter currency code')
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

    async handleTrustSetSubmit(interaction) {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();

        try {
            const currency = interaction.fields.getTextInputValue('currency_input');
            const issuer = interaction.fields.getTextInputValue('issuer_input');
            let limit = "0";

            if (interaction.customId === 'add_trust_modal' || interaction.customId === 'modify_limit_modal') {
                limit = interaction.customId === 'add_trust_modal' 
                    ? interaction.fields.getTextInputValue('limit_input')
                    : interaction.fields.getTextInputValue('new_limit_input');
            }

            const trustSet = {
                TransactionType: "TrustSet",
                Account: interaction.user.address,
                LimitAmount: {
                    currency: currency,
                    issuer: issuer,
                    value: limit
                }
            };

            const prepared = await client.autofill(trustSet);
            const response = await client.submit(prepared, { wallet: interaction.user.wallet });

            const resultEmbed = new EmbedBuilder()
                .setColor(limit === "0" ? '#ff0000' : '#00ff00')
                .setTitle(limit === "0" ? '🔄 Trust Line Removed' : '✅ Trust Line Modified')
                .addFields(
                    { name: 'Currency', value: currency },
                    { name: 'Issuer', value: issuer },
                    { name: 'Status', value: response.result.engine_result },
                    { name: 'Details', value: response.result.engine_result_message }
                );

            await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
        } catch (error) {
            await interaction.reply({
                content: `Error processing trust line: ${error.message}`,
                ephemeral: true
            });
        } finally {
            await client.disconnect();
        }
    }
};
