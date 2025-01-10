import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import xrpl from 'xrpl';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { generateMnemonic } from 'bip39';

export async function handleCreateWallet(interaction) {
    try {
        const wallet = xrpl.Wallet.generate();
        const mnemonic = generateMnemonic(256);
        const recoveryCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // Generate QR code for the wallet address
        const qrBuffer = await QRCode.toBuffer(wallet.address);
        const qrAttachment = new AttachmentBuilder(qrBuffer, { 
            name: `XRPL_QR_${wallet.address.substring(0, 8)}.png`,
            description: `QR Code for XRPL wallet ${wallet.address}`
        });

        const downloadButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('save_wallet_info')
                    .setLabel('Save Wallet Info')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💾'),
                new ButtonBuilder()
                    .setCustomId('download_qr')
                    .setLabel('Download QR Code')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📱')
            );

        const walletEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 IMPORTANT: SAVE THIS INFORMATION NOW!')
            .setDescription('⚠️ **This message will self-destruct in 5 minutes!**')
            .addFields(
                { name: '⏰ Time Remaining', value: 'Window will automatically close in 5 minutes\nStore your information immediately!' },
                { name: '📬 Public Address', value: `\`${wallet.address}\`` },
                { name: '🔑 Family Seed', value: '||`' + wallet.seed + '`||' },
                { name: '🔐 Recovery Code', value: '||`' + recoveryCode + '`||' },
                { name: '📝 Mnemonic Phrase', value: '||`' + mnemonic + '`||' },
                { name: '⚠️ CRITICAL SECURITY NOTES', value: 
                    '- MESSAGE EXPIRES IN 5 MINUTES\n' +
                    '- Save all information in a secure location NOW\n' +
                    '- Never share your private keys with anyone\n' +
                    '- Requires 10 XRP minimum to activate\n'
                },
                { name: '📱 QR Code Information', value: 
                    '# How to use the QR Code:\n' +
                    '1. Click the Save button below\n' +
                    '2. Save the QR code to your device\n' +
                    '3. Use for easy sharing of your public address\n' +
                    '4. Safe to share for receiving payments\n'
                }
            )
            .setImage('attachment://XRPL_QR_' + wallet.address.substring(0, 8) + '.png')
            .setTimestamp();

        const reply = await interaction.reply({ 
            embeds: [walletEmbed], 
            files: [qrAttachment],
            components: [downloadButtons],
            ephemeral: true 
        });
        setTimeout(async () => {
            try {
                await interaction.editReply({ 
                    content: '🔒 Wallet information has expired for security purposes.', 
                    embeds: [], 
                    files: [],
                    components: []
                });
            } catch (error) {
                console.error('Error deleting wallet info:', error);
            }
        }, 300000);

    } catch (error) {
        await interaction.reply({ 
            content: 'Error creating wallet. Please try again.', 
            ephemeral: true 
        });
    }
}

export async function handleWalletInfoDownload(interaction) {
    try {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract information using the exact field names
        const address = fields.find(f => f.name === '📬 Public Address').value.replace(/`/g, '');
        const seed = fields.find(f => f.name === '🔑 Family Seed').value.replace(/[`|]/g, '');
        const recoveryCode = fields.find(f => f.name === '🔐 Recovery Code').value.replace(/[`|]/g, '');
        const mnemonic = fields.find(f => f.name === '📝 Mnemonic Phrase').value.replace(/[`|]/g, '');

        const walletInfo = `XRPL Wallet Information\n\n` +
            `Public Address: ${address}\n` +
            `Family Seed: ${seed}\n` +
            `Recovery Code: ${recoveryCode}\n` +
            `Mnemonic Phrase: ${mnemonic}\n\n` +
            `Created: ${new Date().toLocaleString()}\n\n` +
            `IMPORTANT SECURITY NOTES:\n` +
            `- Keep this information secure and never share your private keys!\n` +
            `- Store this file in a safe location\n` +
            `- Required minimum: 10 XRP to activate wallet`;

        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({
            files: [{
                attachment: Buffer.from(walletInfo),
                name: `XRPL_Wallet_${address.substring(0, 8)}.txt`
            }],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in handleWalletInfoDownload:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'Error downloading wallet information. Please try again.',
                ephemeral: true
            });
        }
    }
}