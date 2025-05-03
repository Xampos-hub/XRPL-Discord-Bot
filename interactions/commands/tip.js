import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DONATIONS_FILE = path.join(__dirname, '..', '..', 'data', 'donations.json');

export default {
    data: new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Send a tip or donation to support this server'),
    
    async execute(interaction) {
        try {
            // Get donation setup for this server
            const serverId = interaction.guildId;
            
            // Read donations file
            let donationSetup;
            try {
                const data = await fs.readFile(DONATIONS_FILE, 'utf8');
                const donations = JSON.parse(data);
                donationSetup = donations.servers[serverId];
            } catch (error) {
                console.error('Error reading donations file:', error);
                return await interaction.reply({
                    content: 'This server has not set up donations yet. Ask an admin to use `/setup-donations`',
                    ephemeral: true
                });
            }
            
            if (!donationSetup) {
                return await interaction.reply({
                    content: 'This server has not set up donations yet. Ask an admin to use `/setup-donations`',
                    ephemeral: true
                });
            }
            
            // Create the tip embed
            const tipEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎁 Send a Tip or Donation')
                .setDescription(`Support this server by sending XRP to their wallet`)
                .addFields(
                    { name: 'Server', value: interaction.guild.name, inline: true },
                    { name: 'Purpose', value: donationSetup.purpose || 'Server Support', inline: true },
                    { 
                        name: 'Wallet Address', 
                        value: `\`${donationSetup.address}\`\n*Click any amount button below to donate*`
                    }
                )
                .setFooter({ text: 'All donations go directly to the server wallet' })
                .setTimestamp();
            
            // Create buttons row 1 (for preset amounts)
            const amountButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`tip_1_${donationSetup.address}`)
                        .setLabel('1 XRP')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💎'),
                    new ButtonBuilder()
                        .setCustomId(`tip_5_${donationSetup.address}`)
                        .setLabel('5 XRP')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💎'),
                    new ButtonBuilder()
                        .setCustomId(`tip_10_${donationSetup.address}`)
                        .setLabel('10 XRP')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💎'),
                    new ButtonBuilder()
                        .setCustomId(`tip_custom_${donationSetup.address}`)
                        .setLabel('Custom Amount')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('✏️')
                );
            
            // Create buttons row 2 (for payment methods)
            const methodButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`tip_xaman_${donationSetup.address}`)
                        .setLabel('Pay with Xaman')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📲'),
                    new ButtonBuilder()
                        .setCustomId(`tip_wallet_${donationSetup.address}`)
                        .setLabel('Pay with Connected Wallet')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('👛'),
                    new ButtonBuilder()
                        .setCustomId(`tip_qr_${donationSetup.address}`)
                        .setLabel('Show QR Code')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📷')
                );
            
            await interaction.reply({
                embeds: [tipEmbed],
                components: [amountButtons, methodButtons],
                ephemeral: false
            });
        } catch (error) {
            console.error('Error showing tip interface:', error);
            await interaction.reply({
                content: 'There was an error showing the tip interface. Please try again.',
                ephemeral: true
            });
        }
    },
    
    // Handle various button interactions
    async handleTipButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'tip_custom') {
            // Show custom amount modal
            await showCustomAmountModal(interaction);
        } 
        else if (customId === 'tip_qr') {
            // Get donation setup and show QR
            const serverId = interaction.guildId;
            const donationSetup = await getServerDonationSetup(serverId);
            
            if (donationSetup) {
                await showPaymentQR(interaction, 'any', donationSetup.address);
            } else {
                await interaction.reply({
                    content: 'Error: Unable to find donation setup for this server.',
                    ephemeral: true
                });
            }
        }
        else if (customId === 'tip_xaman') {
            // Get donation setup and show Xaman payment
            const serverId = interaction.guildId;
            const donationSetup = await getServerDonationSetup(serverId);
            
            if (donationSetup) {
                await createXamanPayment(interaction, 'any', donationSetup.address);
            } else {
                await interaction.reply({
                    content: 'Error: Unable to find donation setup for this server.',
                    ephemeral: true
                });
            }
        }
        else if (customId === 'tip_connected_wallet') {
            // Get donation setup and show connected wallet payment
            const serverId = interaction.guildId;
            const donationSetup = await getServerDonationSetup(serverId);
            
            if (donationSetup) {
                await payFromConnectedWallet(interaction, 'any', donationSetup.address);
            } else {
                await interaction.reply({
                    content: 'Error: Unable to find donation setup for this server.',
                    ephemeral: true
                });
            }
        }
        else if (customId.startsWith('tip_')) {
            // Handle predefined amounts (tip_1, tip_5, tip_10)
            const amount = customId.replace('tip_', '');
            await processTip(interaction, amount);
        }
        else if (customId.startsWith('pay_qr_')) {
            // Show QR code for specific amount
            const amount = customId.replace('pay_qr_', '');
            const serverId = interaction.guildId;
            const donationSetup = await getServerDonationSetup(serverId);
            
            if (donationSetup) {
                await showPaymentQR(interaction, amount, donationSetup.address);
            } else {
                await interaction.reply({
                    content: 'Error: Unable to find donation setup for this server.',
                    ephemeral: true
                });
            }
        }
        else if (customId.startsWith('pay_xaman_')) {
            // Create Xaman payment for specific amount
            const [_, __, amount, address] = customId.split('_');
            await createXamanPayment(interaction, amount, address);
        }
        else if (customId.startsWith('pay_wallet_')) {
            // Pay from connected wallet with specific amount
            const [_, __, amount, address] = customId.split('_');
            await payFromConnectedWallet(interaction, amount, address);
        }
        else if (customId.startsWith('confirm_payment_')) {
            // Execute wallet payment
            const [_, __, amount, address] = customId.split('_');
            await executeWalletPayment(interaction, amount, address);
        }
        else if (customId === 'cancel_payment') {
            // Cancel payment
            await interaction.update({
                content: 'Payment cancelled.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    },
    
    // Handle modal submissions
    async handleTipModalSubmission(interaction) {
        if (interaction.customId === 'tip_custom_amount_modal') {
            const amount = interaction.fields.getTextInputValue('tip_amount');
            
            // Validate amount
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                await interaction.reply({
                    content: 'Please enter a valid amount greater than 0.',
                    ephemeral: true
                });
                return;
            }
            
            // Process the tip with the custom amount
            await processTip(interaction, numAmount);
        }
    }
};