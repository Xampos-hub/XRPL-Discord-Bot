import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import xrpl from 'xrpl';
import QRCode from 'qrcode';
import { getConnectedWallet } from './walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DONATIONS_FILE = path.join(__dirname, '..', 'data', 'donations.json');

// Get donation setup for a server
export async function getServerDonationSetup(serverId) {
    try {
        const data = await fs.readFile(DONATIONS_FILE, 'utf8');
        const donations = JSON.parse(data);
        return donations.servers[serverId] || null;
    } catch (error) {
        console.error('Error getting donation setup:', error);
        return null;
    }
}

// Save donation setup for a server
export async function saveServerDonationSetup(serverId, donationInfo) {
    try {
        // Read current data
        let donations;
        try {
            const data = await fs.readFile(DONATIONS_FILE, 'utf8');
            donations = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist or is invalid, start fresh
            donations = { servers: {} };
        }

        // Update with new info
        donations.servers[serverId] = donationInfo;

        // Write back to file
        await fs.writeFile(DONATIONS_FILE, JSON.stringify(donations, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving donation setup:', error);
        return false;
    }
}

// Show the donation/tip UI
export async function showTipInterface(interaction) {
    try {
        // Check if this server has donations set up
        const serverId = interaction.guildId;
        const donationSetup = await getServerDonationSetup(serverId);

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
            .setDescription(`Support this server by sending XRP or tokens to their wallet`)
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

        // If there's a custom message, add it
        if (donationSetup.message) {
            tipEmbed.addFields({ name: 'Message from Server', value: donationSetup.message });
        }

        // Create buttons for predetermined amounts
        const amountButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tip_1')
                    .setLabel('1 XRP')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('tip_5')
                    .setLabel('5 XRP')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('tip_10')
                    .setLabel('10 XRP')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('tip_custom')
                    .setLabel('Custom Amount')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✏️')
            );

        // Create buttons for alternative options
        const optionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tip_qr')
                    .setLabel('Show QR Code')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📱'),
                new ButtonBuilder()
                    .setCustomId('tip_xaman')
                    .setLabel('Pay with Xaman')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📲'),
                new ButtonBuilder()
                    .setCustomId('tip_connected_wallet')
                    .setLabel('Use Connected Wallet')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👛')
            );

        await interaction.reply({
            embeds: [tipEmbed],
            components: [amountButtons, optionButtons]
        });
    } catch (error) {
        console.error('Error showing tip interface:', error);
        await interaction.reply({
            content: 'There was an error showing the tip interface. Please try again.',
            ephemeral: true
        });
    }
}

// Handle the custom amount input
export async function showCustomAmountModal(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('tip_custom_amount_modal')
            .setTitle('Enter Custom Tip Amount');

        const amountInput = new TextInputBuilder()
            .setCustomId('tip_amount')
            .setLabel('Amount in XRP')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter amount (e.g. 2.5)')
            .setRequired(true);

        const amountRow = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(amountRow);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing custom amount modal:', error);
        await interaction.reply({
            content: 'There was an error processing your request. Please try again.',
            ephemeral: true
        });
    }
}

// Process a tip with a specific amount
export async function processTip(interaction, amount) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Get the server's donation address
        const serverId = interaction.guildId;
        const donationSetup = await getServerDonationSetup(serverId);

        if (!donationSetup) {
            return await interaction.editReply({
                content: 'This server has not set up donations properly.',
                ephemeral: true
            });
        }

        // Check if user has a connected wallet
        const userId = interaction.user.id;
        const wallet = await getConnectedWallet(userId);

        // Create payment options embed
        const paymentEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`💸 Send ${amount} XRP Tip`)
            .setDescription('Choose how you want to send this tip:')
            .addFields(
                { name: 'To Server', value: interaction.guild.name, inline: true },
                { name: 'Amount', value: `${amount} XRP`, inline: true },
                { name: 'Recipient Address', value: `\`${donationSetup.address}\`` }
            );

        // Create payment option buttons
        const paymentButtons = new ActionRowBuilder();
        
        // Always offer the QR and Xaman options
        paymentButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`pay_qr_${amount}`)
                .setLabel('Show QR Code')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📱'),
            new ButtonBuilder()
                .setCustomId(`pay_xaman_${amount}_${donationSetup.address}`)
                .setLabel('Pay with Xaman')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📲')
        );

        // Only offer the connected wallet option if they have one
        if (wallet) {
            paymentButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`pay_wallet_${amount}_${donationSetup.address}`)
                    .setLabel('Pay from Connected Wallet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👛')
            );

            // Add info about their connected wallet
            paymentEmbed.addFields({ 
                name: 'Your Connected Wallet', 
                value: `\`${wallet.address}\`` 
            });
        } else {
            // Suggest connecting a wallet
            paymentEmbed.addFields({ 
                name: 'No Wallet Connected', 
                value: 'Use `/wallet` to connect your wallet for easier tipping' 
            });
        }

        await interaction.editReply({
            embeds: [paymentEmbed],
            components: [paymentButtons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error processing tip:', error);
        if (interaction.deferred) {
            await interaction.editReply({
                content: 'There was an error processing the tip. Please try again.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'There was an error processing the tip. Please try again.',
                ephemeral: true
            });
        }
    }
}

// Generate and show the QR code for a tip
export async function showPaymentQR(interaction, amount, address) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Generate QR code for the wallet address
        const qrBuffer = await QRCode.toBuffer(address);
        
        // Create embedded message with QR code
        const qrEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Payment QR Code for ${amount} XRP`)
            .setDescription(`Scan this QR code with your XRPL wallet app to send ${amount} XRP`)
            .addFields(
                { name: 'Recipient Address', value: `\`${address}\`` },
                { name: 'Amount', value: `${amount} XRP`, inline: true },
                { name: 'Network', value: 'XRPL', inline: true },
                { name: 'Instructions', value: 'After sending, you can verify the transaction in your wallet.' }
            )
            .setImage('attachment://payment_qr.png')
            .setFooter({ text: 'This QR code only contains the recipient address, verify amount in your wallet' });

        await interaction.editReply({
            embeds: [qrEmbed],
            files: [{ attachment: qrBuffer, name: 'payment_qr.png' }],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error showing payment QR:', error);
        await interaction.editReply({
            content: 'There was an error generating the QR code. Please try again.',
            ephemeral: true
        });
    }
}

// Generate an Xaman (XUMM) payment link
export async function createXamanPayment(interaction, amount, destinationAddress) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // In a real implementation, you would integrate with the Xaman/XUMM SDK
        // For now, we'll create a deep link that pre-fills transaction details
        
        // Convert amount to drops for the URL
        const dropsAmount = String(Number(amount) * 1000000);
        
        // Create the Xaman deep link
        const xamanLink = `https://xumm.app/detect/xrp?to=${destinationAddress}&amount=${dropsAmount}`;
        
        const xamanEmbed = new EmbedBuilder()
            .setColor('#00aae7')
            .setTitle('Pay with Xaman Wallet')
            .setDescription(`Send ${amount} XRP to support the server`)
            .addFields(
                { name: 'Amount', value: `${amount} XRP`, inline: true },
                { name: 'To', value: `${destinationAddress.substring(0, 8)}...`, inline: true },
                { name: 'Instructions', value: 'Click the button below to open Xaman and confirm the payment' }
            )
            .setFooter({ text: 'Xaman was formerly known as XUMM wallet' });
            
        const xamanButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Open in Xaman')
                    .setStyle(ButtonStyle.Link)
                    .setURL(xamanLink)
                    .setEmoji('📲')
            );
            
        await interaction.editReply({
            embeds: [xamanEmbed],
            components: [xamanButton],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error creating Xaman payment:', error);
        await interaction.editReply({
            content: 'There was an error creating the Xaman payment. Please try again.',
            ephemeral: true
        });
    }
}

// Handle payment from connected wallet
export async function payFromConnectedWallet(interaction, amount, destinationAddress) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        // Get user's wallet
        const userId = interaction.user.id;
        const wallet = await getConnectedWallet(userId);
        
        if (!wallet) {
            return await interaction.editReply({
                content: 'You need to connect a wallet first. Use `/wallet` to connect a wallet.',
                ephemeral: true
            });
        }
        
        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('Confirm Payment')
            .setDescription(`Please confirm that you want to send ${amount} XRP from your connected wallet`)
            .addFields(
                { name: 'From', value: `\`${wallet.address}\``, inline: true },
                { name: 'To', value: `\`${destinationAddress}\``, inline: true },
                { name: 'Amount', value: `${amount} XRP`, inline: true },
                { name: '⚠️ Warning', value: 'This will initiate a real transaction from your connected wallet' }
            );
            
        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_payment_${amount}_${destinationAddress}`)
                    .setLabel('Confirm Payment')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_payment')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
            
        await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmButtons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error preparing wallet payment:', error);
        await interaction.editReply({
            content: 'There was an error preparing the payment. Please try again.',
            ephemeral: true
        });
    }
}

// Execute the actual payment transaction
export async function executeWalletPayment(interaction, amount, destinationAddress) {
    try {
        await interaction.deferUpdate();
        
        // Get user's wallet
        const userId = interaction.user.id;
        const wallet = await getConnectedWallet(userId);
        
        if (!wallet) {
            return await interaction.editReply({
                content: 'Wallet connection lost. Please reconnect your wallet and try again.',
                components: [],
                ephemeral: true
            });
        }
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        try {
            // Prepare payment transaction
            const paymentTx = {
                TransactionType: "Payment",
                Account: wallet.address,
                Destination: destinationAddress,
                Amount: xrpl.xrpToDrops(amount),
                Fee: "12"
            };
            
            // Prepare and sign transaction
            const prepared = await client.autofill(paymentTx);
            const signed = wallet.sign(prepared);
            
            // Submit transaction
            const result = await client.submitAndWait(signed.tx_blob);
            
            if (result.result.meta.TransactionResult === "tesSUCCESS") {
                // Transaction successful - create a success embed
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Payment Successful')
                    .setDescription(`You have successfully sent ${amount} XRP to support the server!`)
                    .addFields(
                        { name: 'Amount', value: `${amount} XRP`, inline: true },
                        { name: 'To', value: `${destinationAddress.substring(0, 8)}...`, inline: true },
                        { name: 'Transaction Hash', value: result.result.hash, inline: false },
                        { name: 'View on Explorer', value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${result.result.hash})` }
                    )
                    .setTimestamp();
                    
                // Notify the server about the donation
                try {
                    // Get donation channel if configured
                    const serverSetup = await getServerDonationSetup(interaction.guildId);
                    if (serverSetup && serverSetup.notificationChannelId) {
                        const notificationChannel = interaction.guild.channels.cache.get(serverSetup.notificationChannelId);
                        
                        if (notificationChannel) {
                            const notificationEmbed = new EmbedBuilder()
                                .setColor('#00ff00')
                                .setTitle('🎉 New Donation Received!')
                                .setDescription(`${interaction.user.tag} has donated ${amount} XRP to the server!`)
                                .addFields(
                                    { name: 'Amount', value: `${amount} XRP`, inline: true },
                                    { name: 'From', value: interaction.user.tag, inline: true },
                                    { name: 'Transaction', value: `[View on Explorer](https://livenet.xrpl.org/transactions/${result.result.hash})` }
                                )
                                .setThumbnail(interaction.user.displayAvatarURL())
                                .setTimestamp();
                                
                            await notificationChannel.send({ embeds: [notificationEmbed] });
                        }
                    }
                } catch (notifyError) {
                    console.error('Error sending donation notification:', notifyError);
                    // Continue anyway since the payment was successful
                }
                
                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [],
                    ephemeral: true
                });
            } else {
                // Transaction failed
                await interaction.editReply({
                    content: `❌ Payment failed: ${result.result.meta.TransactionResult}`,
                    components: [],
                    ephemeral: true
                });
            }
        } finally {
            await client.disconnect();
        }
    } catch (error) {
        console.error('Error executing payment:', error);
        await interaction.editReply({
            content: `❌ Error executing payment: ${error.message}`,
            components: [],
            ephemeral: true
        });
    }
}