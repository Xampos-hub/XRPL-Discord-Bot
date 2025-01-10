import 'dotenv/config';
import { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder, 
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleCheckBalance } from './features/checkBalance.js';
import { handleTransactionHistory } from './features/transactionHistory.js';
import { handleEscrowStatus } from './features/escrowStatus.js';
import { handleNFTHoldings } from './features/nftHoldings.js';
import { handleTransactionDecode } from './features/transactionDecoder.js';
import { handleCreateWallet, handleWalletInfoDownload } from './features/createWallet.js';
import QRCode from 'qrcode';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./interactions/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = await import(`./interactions/commands/${file}`);
    client.commands.set(command.default.data.name, command.default);
}

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'There was an error executing this command!', 
                ephemeral: true 
            });
        }
    }

    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'save_wallet_info':
                await handleWalletInfoDownload(interaction);
                break;
            case 'download_qr':
                try {
                    const message = interaction.message;
                    const embed = message.embeds[0];
                    const address = embed.fields.find(f => f.name === '📬 Public Address').value.replace(/`/g, '');
                    
                    // Generate a fresh QR code
                    const qrBuffer = await QRCode.toBuffer(address);
                    const qrAttachment = new AttachmentBuilder(qrBuffer, { 
                        name: `XRPL_QR_${address.substring(0, 8)}.png`,
                        description: `QR Code for XRPL wallet ${address}`
                    });

                    await interaction.reply({
                        content: `Here's your QR code for address ${address.substring(0, 8)}...`,
                        files: [qrAttachment],
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('QR Download Error:', error);
                    await interaction.reply({
                        content: "Failed to download QR code. Please try again.",
                        ephemeral: true
                    });
                }
                break;
            case 'check_balance':
                const modal = new ModalBuilder()
                    .setCustomId('balance_modal')
                    .setTitle('Check Wallet Balance');

                const addressInput = new TextInputBuilder()
                    .setCustomId('address_input')
                    .setLabel('Enter XRPL Address')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(addressInput);
                modal.addComponents(firstActionRow);
                await interaction.showModal(modal);
                break;

                case 'view_trust_lines':
    const trustEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🤝 Trust Line Manager')
        .setDescription('Select an option to manage trust lines');

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
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

    await interaction.reply({
        embeds: [trustEmbed],
        components: [trustButtons],
        ephemeral: true
    });
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

            case 'decode_transaction':
                const decodeModal = new ModalBuilder()
                    .setCustomId('decode_modal')
                    .setTitle('Decode Transaction');

                const hashInput = new TextInputBuilder()
                    .setCustomId('tx_hash_input')
                    .setLabel('Enter Transaction Hash')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the transaction hash to decode')
                    .setRequired(true);

                const hashRow = new ActionRowBuilder().addComponents(hashInput);
                decodeModal.addComponents(hashRow);
                await interaction.showModal(decodeModal);
                break;

            case 'create_wallet':
                await handleCreateWallet(interaction);
                break;
        }
    }
    if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
            case 'balance_modal':
                await handleCheckBalance(interaction);
                break;
            case 'tx_modal':
                await handleTransactionHistory(interaction);
                break;
            case 'escrow_modal':
                await handleEscrowStatus(interaction);
                break;
            case 'nft_modal':
                await handleNFTHoldings(interaction);
                break;
            case 'decode_modal':
                await handleTransactionDecode(interaction);
                break;
        }
    }
});

client.once('ready', () => {
    console.log('Bot is ready!');
});

client.login(process.env.DISCORD_TOKEN);
