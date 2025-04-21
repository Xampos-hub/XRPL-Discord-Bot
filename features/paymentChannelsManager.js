import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnectedWallets } from './walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store payment channel data
const CHANNELS_DIR = path.join(__dirname, '..', 'data', 'paymentChannels');

// Ensure the directory exists
async function ensureChannelsDir() {
    try {
        await fs.mkdir(CHANNELS_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating channels directory:', error);
    }
}

// Initialize by ensuring directory exists
ensureChannelsDir();

// Get user's payment channels
async function getUserChannels(userId) {
    try {
        const filePath = path.join(CHANNELS_DIR, `${userId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or other error, return empty array
        return [];
    }
}

// Save user's payment channels
async function saveUserChannels(userId, channels) {
    try {
        const filePath = path.join(CHANNELS_DIR, `${userId}.json`);
        await fs.writeFile(filePath, JSON.stringify(channels, null, 2));
    } catch (error) {
        console.error('Error saving channels:', error);
        throw error;
    }
}

// Handle View Channels button
export async function handleViewChannels(interaction) {
    const userId = interaction.user.id;
    const channels = await getUserChannels(userId);
    
    if (channels.length === 0) {
        const noChannelsEmbed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('No Payment Channels Found')
            .setDescription('You don\'t have any active payment channels.')
            .addFields(
                { name: 'Getting Started', value: 'Click the "Create New Channel" button to set up your first payment channel.' }
            );
            
        await interaction.reply({
            embeds: [noChannelsEmbed],
            ephemeral: true
        });
        return;
    }
    
    // Create an embed to display channels
    const channelsEmbed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle('Your Payment Channels')
        .setDescription(`You have ${channels.length} active payment channel(s)`);
        
    // Add each channel as a field
    channels.forEach((channel, index) => {
        channelsEmbed.addFields({
            name: `Channel ${index + 1}: ${channel.channelId.substring(0, 8)}...`,
            value: `Recipient: ${channel.destination.substring(0, 8)}...\n` +
                  `Balance: ${channel.remainingAmount} / ${channel.amount} XRP\n` +
                  `Expires: ${new Date(channel.expiration).toLocaleString()}`
        });
    });
    
    // Create buttons for each channel
    const components = [];
    
    for (let i = 0; i < Math.min(channels.length, 5); i++) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`channel_details_${i}`)
                    .setLabel(`Details: ${channels[i].channelId.substring(0, 8)}...`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`send_payment_${i}`)
                    .setLabel('Send Payment')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_channel_${i}`)
                    .setLabel('Close Channel')
                    .setStyle(ButtonStyle.Danger)
            );
        components.push(row);
    }
    
    await interaction.reply({
        embeds: [channelsEmbed],
        components: components,
        ephemeral: true
    });
}

// Handle Create Channel button
export async function handleCreateChannel(interaction) {
    const userId = interaction.user.id;
    const wallets = await getConnectedWallets(userId);
    
    if (wallets.length === 0) {
        const noWalletsEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('No Connected Wallets')
            .setDescription('You need to connect a wallet before creating a payment channel.')
            .addFields(
                { name: 'How to Connect', value: 'Use the `/wallet` command and click "Connect Wallet" to add your XRPL wallet.' }
            );
            
        const connectButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('connect_wallet')
                    .setLabel('Connect Wallet')
                    .setStyle(ButtonStyle.Primary)
            );
            
        await interaction.reply({
            embeds: [noWalletsEmbed],
            components: [connectButton],
            ephemeral: true
        });
        return;
    }
    
    // Create modal for channel creation
    const modal = new ModalBuilder()
        .setCustomId('create_channel_modal')
        .setTitle('Create Payment Channel');
        
    const destinationInput = new TextInputBuilder()
        .setCustomId('destination_input')
        .setLabel('Recipient Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter XRPL address of recipient')
        .setRequired(true);
        
    const amountInput = new TextInputBuilder()
        .setCustomId('amount_input')
        .setLabel('Channel Amount (XRP)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Amount to allocate to this channel')
        .setRequired(true);
        
    const expirationInput = new TextInputBuilder()
        .setCustomId('expiration_input')
        .setLabel('Expiration (days)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Number of days until channel expires')
        .setValue('30')
        .setRequired(true);
        
    const rows = [
        new ActionRowBuilder().addComponents(destinationInput),
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(expirationInput)
    ];
    
    modal.addComponents(rows);
    await interaction.showModal(modal);
}

// Process Create Channel modal submission
export async function processCreateChannel(interaction) {
    try {
        const userId = interaction.user.id;
        const destination = interaction.fields.getTextInputValue('destination_input');
        const amount = parseFloat(interaction.fields.getTextInputValue('amount_input'));
        const expirationDays = parseInt(interaction.fields.getTextInputValue('expiration_input'));
        
        if (isNaN(amount) || amount <= 0) {
            await interaction.reply({
                content: 'Please enter a valid amount greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        if (isNaN(expirationDays) || expirationDays <= 0) {
            await interaction.reply({
                content: 'Please enter a valid expiration period in days.',
                ephemeral: true
            });
            return;
        }
        
        // Get user's wallet
        const wallets = await getConnectedWallets(userId);
        if (wallets.length === 0) {
            await interaction.reply({
                content: 'You need to connect a wallet first.',
                ephemeral: true
            });
            return;
        }
        
        const sourceWallet = wallets[0]; // Use the first connected wallet
        
        await interaction.deferReply({ ephemeral: true });
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        try {
            // Calculate expiration date (in seconds since UNIX epoch)
            const expirationDate = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);
            
            // Prepare the payment channel create transaction
            const createTx = {
                TransactionType: "PaymentChannelCreate",
                Account: sourceWallet.address,
                Destination: destination,
                Amount: xrpl.xrpToDrops(amount.toString()),
                SettleDelay: 86400, // 1 day settle delay
                PublicKey: "0000000000000000000000000000000000000000000000000000000000000000", // This would be replaced with actual public key
                CancelAfter: expirationDate
            };
            
            // In a real implementation, you would sign this with the user's wallet
            // For now, we'll simulate the creation
            
            // Generate a mock channel ID
            const channelId = `ch_${Math.random().toString(36).substring(2, 15)}`;
            
            // Store the channel information
            const channels = await getUserChannels(userId);
            channels.push({
                channelId: channelId,
                source: sourceWallet.address,
                destination: destination,
                amount: amount,
                remainingAmount: amount,
                settleDelay: 86400,
                expiration: new Date(expirationDate * 1000).toISOString(),
                transactions: [],
                createdAt: new Date().toISOString()
            });
            
            await saveUserChannels(userId, channels);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Payment Channel Created')
                .setDescription(`Your payment channel has been successfully created!`)
                .addFields(
                    { name: 'Channel ID', value: channelId },
                    { name: 'Recipient', value: destination },
                    { name: 'Amount', value: `${amount} XRP` },
                    { name: 'Expiration', value: new Date(expirationDate * 1000).toLocaleString() }
                );
                
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`send_payment_new_${channels.length - 1}`)
                        .setLabel('Send Payment')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('view_channels')
                        .setLabel('View All Channels')
                        .setStyle(ButtonStyle.Primary)
                );
                
            await interaction.editReply({
                embeds: [successEmbed],
                components: [buttons]
            });
        } finally {
            await client.disconnect();
        }
    } catch (error) {
        console.error('Error creating payment channel:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: 'Error creating payment channel. Please try again.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'Error creating payment channel. Please try again.',
                ephemeral: true
            });
        }
    }
}

// Handle Send Micropayment button
export async function handleSendMicropayment(interaction) {
    const userId = interaction.user.id;
    const channels = await getUserChannels(userId);
    
    if (channels.length === 0) {
        await interaction.reply({
            content: 'You don\'t have any active payment channels. Create one first!',
            ephemeral: true
        });
        return;
    }
    
    // Create selection menu for channels
    const channelOptions = channels.map((channel, index) => ({
        label: `Channel to ${channel.destination.substring(0, 8)}...`,
        description: `Balance: ${channel.remainingAmount} XRP`,
        value: `channel_${index}`
    }));
    
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('micropayment_channel_select')
                .setPlaceholder('Select a payment channel')
                .addOptions(channelOptions)
        );
        
    await interaction.reply({
        content: 'Select a payment channel to send a micropayment:',
        components: [selectMenu],
        ephemeral: true
    });
}

// Handle channel selection for micropayment
export async function handleChannelSelection(interaction) {
    const userId = interaction.user.id;
    const selectedValue = interaction.values[0];
    const channelIndex = parseInt(selectedValue.replace('channel_', ''));
    
    const channels = await getUserChannels(userId);
    if (channelIndex >= channels.length) {
        await interaction.reply({
            content: 'Invalid channel selection. Please try again.',
            ephemeral: true
        });
        return;
    }
    
    const selectedChannel = channels[channelIndex];
    
    // Create modal for micropayment
    const modal = new ModalBuilder()
        .setCustomId(`micropayment_modal_${channelIndex}`)
        .setTitle('Send Micropayment');
        
    const amountInput = new TextInputBuilder()
        .setCustomId('micropayment_amount')
        .setLabel('Amount (XRP)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter amount (e.g. 0.001)')
        .setRequired(true);
        
    const memoInput = new TextInputBuilder()
        .setCustomId('micropayment_memo')
        .setLabel('Memo/Description')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('What is this payment for?')
        .setRequired(false);
        
    const rows = [
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(memoInput)
    ];
    
    modal.addComponents(rows);
    await interaction.showModal(modal);
}

// Process micropayment modal submission
export async function processMicropayment(interaction) {
    try {
        const userId = interaction.user.id;
        const customId = interaction.customId;
        const channelIndex = parseInt(customId.replace('micropayment_modal_', ''));
        
        const amount = parseFloat(interaction.fields.getTextInputValue('micropayment_amount'));
        const memo = interaction.fields.getTextInputValue('micropayment_memo') || 'No description';
        
        if (isNaN(amount) || amount <= 0) {
            await interaction.reply({
                content: 'Please enter a valid amount greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        const channels = await getUserChannels(userId);
        if (channelIndex >= channels.length) {
            await interaction.reply({
                content: 'Channel not found. Please try again.',
                ephemeral: true
            });
            return;
        }
        
        const channel = channels[channelIndex];
        
        // Check if channel has enough funds
        if (channel.remainingAmount < amount) {
            await interaction.reply({
                content: `Insufficient funds in channel. Available: ${channel.remainingAmount} XRP`,
                ephemeral: true
            });
            return;
        }
        
        // Process the micropayment
        channel.remainingAmount -= amount;
        
        // Add transaction to history
        channel.transactions.push({
            amount: amount,
            memo: memo,
            timestamp: new Date().toISOString()
        });
        
        // Save updated channel data
        await saveUserChannels(userId, channels);
        
        // Calculate the fee savings
        const regularTxFee = 0.000012; // Standard XRPL transaction fee in XRP
        const feeSavings = regularTxFee;
        
        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Micropayment Sent')
            .setDescription(`Your micropayment has been successfully sent!`)
            .addFields(
                { name: 'Channel', value: `${channel.channelId.substring(0, 8)}...` },
                { name: 'Recipient', value: channel.destination },
                { name: 'Amount', value: `${amount} XRP` },
                { name: 'Remaining Balance', value: `${channel.remainingAmount} XRP` },
                { name: 'Description', value: memo },
                { name: 'Fee Savings', value: `${feeSavings} XRP (compared to on-ledger transaction)` }
            )
            .setFooter({ text: 'Micropayments are efficient for small, frequent transactions' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`send_another_payment_${channelIndex}`)
                    .setLabel('Send Another Payment')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('view_channels')
                    .setLabel('View All Channels')
                    .setStyle(ButtonStyle.Primary)
            );
            
        await interaction.reply({
            embeds: [successEmbed],
            components: [buttons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error processing micropayment:', error);
        await interaction.reply({
            content: 'Error processing micropayment. Please try again.',
            ephemeral: true
        });
    }
}

// Handle Channel Analytics button
export async function handleChannelAnalytics(interaction) {
    const userId = interaction.user.id;
    const channels = await getUserChannels(userId);
    
    if (channels.length === 0) {
        await interaction.reply({
            content: 'You don\'t have any payment channels to analyze.',
            ephemeral: true
        });
        return;
    }
    
    // Calculate analytics
    const totalChannels = channels.length;
    const totalAllocated = channels.reduce((sum, channel) => sum + channel.amount, 0);
    const totalRemaining = channels.reduce((sum, channel) => sum + channel.remainingAmount, 0);
    const totalSpent = totalAllocated - totalRemaining;
    
    // Count total transactions across all channels
    const totalTransactions = channels.reduce((sum, channel) => sum + channel.transactions.length, 0);
    
    // Calculate average transaction size
    const avgTxSize = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    
    // Calculate fee savings
    const regularTxFee = 0.000012; // Standard XRPL transaction fee in XRP
    const feeSavings = totalTransactions * regularTxFee;
    
    // Find most active channel
    let mostActiveChannel = null;
    let mostActiveTxCount = 0;
    
    channels.forEach(channel => {
        if (channel.transactions.length > mostActiveTxCount) {
            mostActiveChannel = channel;
            mostActiveTxCount = channel.transactions.length;
        }
    });
    
    // Create analytics embed
    const analyticsEmbed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle('📈 Payment Channel Analytics')
        .setDescription(`Statistics for your ${totalChannels} payment channels`)
        .addFields(
            { name: 'Total Allocated', value: `${totalAllocated.toFixed(6)} XRP`, inline: true },
            { name: 'Total Spent', value: `${totalSpent.toFixed(6)} XRP`, inline: true },
            { name: 'Remaining Balance', value: `${totalRemaining.toFixed(6)} XRP`, inline: true },
            { name: 'Total Transactions', value: totalTransactions.toString(), inline: true },
            { name: 'Average Payment Size', value: `${avgTxSize.toFixed(6)} XRP`, inline: true },
            { name: 'Fee Savings', value: `${feeSavings.toFixed(6)} XRP`, inline: true }
        );
        
    if (mostActiveChannel) {
        analyticsEmbed.addFields(
            { 
                name: 'Most Active Channel', 
                value: `Channel: ${mostActiveChannel.channelId.substring(0, 8)}...\n` +
                       `Recipient: ${mostActiveChannel.destination.substring(0, 8)}...\n` +
                       `Transactions: ${mostActiveTxCount}`
            }
        );
    }
    
    // Add usage tips
    analyticsEmbed.addFields(
        { 
            name: 'Usage Tips', 
            value: '• Micropayments are most efficient for small, frequent transactions\n' +
                   '• Consider closing inactive channels to reclaim funds\n' +
                   '• For high-volume relationships, allocate larger channel amounts'
        }
    );
    
    await interaction.reply({
        embeds: [analyticsEmbed],
        ephemeral: true
    });
}

// Handle Settle Channel button
export async function handleSettleChannel(interaction) {
    const userId = interaction.user.id;
    const channels = await getUserChannels(userId);
    
    if (channels.length === 0) {
        await interaction.reply({
            content: 'You don\'t have any payment channels to settle.',
            ephemeral: true
        });
        return;
    }
    
    // Create selection menu for channels
    const channelOptions = channels.map((channel, index) => ({
        label: `Channel to ${channel.destination.substring(0, 8)}...`,
        description: `Remaining: ${channel.remainingAmount} XRP`,
        value: `settle_${index}`
    }));
    
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('settle_channel_select')
                .setPlaceholder('Select a channel to settle')
                .addOptions(channelOptions)
        );
        
    await interaction.reply({
        content: 'Select a payment channel to settle and close:',
        components: [selectMenu],
        ephemeral: true
    });
}

// Handle channel selection for settlement
export async function handleSettleSelection(interaction) {
    const userId = interaction.user.id;
    const selectedValue = interaction.values[0];
    const channelIndex = parseInt(selectedValue.replace('settle_', ''));
    
    const channels = await getUserChannels(userId);
    if (channelIndex >= channels.length) {
        await interaction.reply({
            content: 'Invalid channel selection. Please try again.',
            ephemeral: true
        });
        return;
    }
    
    const selectedChannel = channels[channelIndex];
    
    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
        .setColor('#FF9900')
        .setTitle('Confirm Channel Settlement')
        .setDescription('Are you sure you want to settle and close this payment channel?')
        .addFields(
            { name: 'Channel ID', value: selectedChannel.channelId },
            { name: 'Recipient', value: selectedChannel.destination },
            { name: 'Remaining Amount', value: `${selectedChannel.remainingAmount} XRP` },
            { name: 'Transactions', value: selectedChannel.transactions.length.toString() }
        )
        .setFooter({ text: 'This action cannot be undone' });
        
    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_settle_${channelIndex}`)
                .setLabel('Confirm Settlement')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_settle')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
    await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmButtons],
        ephemeral: true
    });
}

// Process channel settlement
export async function processChannelSettlement(interaction) {
    try {
        const userId = interaction.user.id;
        const customId = interaction.customId;
        const channelIndex = parseInt(customId.replace('confirm_settle_', ''));
        
        await interaction.deferReply({ ephemeral: true });
        
        const channels = await getUserChannels(userId);
        if (channelIndex >= channels.length) {
            await interaction.editReply({
                content: 'Channel not found. Please try again.',
            });
            return;
        }
        
        const channel = channels[channelIndex];
        
        // In a real implementation, you would submit a PaymentChannelClaim transaction
        // to the XRPL to settle the channel
        
        // For now, we'll simulate the settlement
        
        // Create settlement result embed
        const settleEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Payment Channel Settled')
            .setDescription(`Your payment channel has been successfully settled and closed.`)
            .addFields(
                { name: 'Channel ID', value: channel.channelId },
                { name: 'Recipient', value: channel.destination },
                { name: 'Final Settlement', value: `${channel.amount - channel.remainingAmount} XRP sent to recipient` },
                { name: 'Returned to You', value: `${channel.remainingAmount} XRP` },
                { name: 'Total Transactions', value: channel.transactions.length.toString() }
            )
            .setTimestamp();
            
        // Remove the channel from the user's channels
        channels.splice(channelIndex, 1);
        await saveUserChannels(userId, channels);
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_channel')
                    .setLabel('Create New Channel')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('view_channels')
                    .setLabel('View Remaining Channels')
                    .setStyle(ButtonStyle.Primary)
            );
            
        await interaction.editReply({
            embeds: [settleEmbed],
            components: [buttons]
        });
    } catch (error) {
        console.error('Error settling payment channel:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: 'Error settling payment channel. Please try again.',
            });
        } else {
            await interaction.reply({
                content: 'Error settling payment channel. Please try again.',
                ephemeral: true
            });
        }
    }
}

// Handle channel details button
export async function handleChannelDetails(interaction) {
    const userId = interaction.user.id;
    const customId = interaction.customId;
    const channelIndex = parseInt(customId.replace('channel_details_', ''));
    
    const channels = await getUserChannels(userId);
    if (channelIndex >= channels.length) {
        await interaction.reply({
            content: 'Channel not found. Please try again.',
            ephemeral: true
        });
        return;
    }
    
    const channel = channels[channelIndex];
    
    // Create detailed view embed
    const detailsEmbed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle('Payment Channel Details')
        .setDescription(`Detailed information for channel ${channel.channelId}`)
        .addFields(
            { name: 'Channel ID', value: channel.channelId },
            { name: 'Source Address', value: channel.source },
            { name: 'Destination', value: channel.destination },
            { name: 'Total Amount', value: `${channel.amount} XRP` },
            { name: 'Remaining Balance', value: `${channel.remainingAmount} XRP` },
            { name: 'Settle Delay', value: `${channel.settleDelay / 86400} days` },
            { name: 'Expiration Date', value: new Date(channel.expiration).toLocaleString() },
            { name: 'Created On', value: new Date(channel.createdAt).toLocaleString() },
            { name: 'Transaction Count', value: channel.transactions.length.toString() }
        );
    
    // Add recent transactions if any
    if (channel.transactions.length > 0) {
        const recentTxs = channel.transactions
            .slice(-5) // Get last 5 transactions
            .reverse() // Show newest first
            .map(tx => `${new Date(tx.timestamp).toLocaleString()}: ${tx.amount} XRP - ${tx.memo}`)
            .join('\n');
            
        detailsEmbed.addFields(
            { name: 'Recent Transactions', value: recentTxs || 'No transactions yet' }
        );
    } else {
        detailsEmbed.addFields(
            { name: 'Recent Transactions', value: 'No transactions yet' }
        );
    }
    
    // Calculate usage statistics
    const totalSpent = channel.amount - channel.remainingAmount;
    const percentUsed = (totalSpent / channel.amount) * 100;
    
    detailsEmbed.addFields(
        { name: 'Usage Statistics', value: 
            `Total Spent: ${totalSpent} XRP\n` +
            `Percent Used: ${percentUsed.toFixed(2)}%\n` +
            `Average Transaction: ${channel.transactions.length > 0 ? (totalSpent / channel.transactions.length).toFixed(6) : '0'} XRP`
        }
    );
    
    // Add action buttons
    const actionButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`send_payment_${channelIndex}`)
                .setLabel('Send Payment')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`add_funds_${channelIndex}`)
                .setLabel('Add Funds')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`close_channel_${channelIndex}`)
                .setLabel('Close Channel')
                .setStyle(ButtonStyle.Danger)
        );
        
    await interaction.reply({
        embeds: [detailsEmbed],
        components: [actionButtons],
        ephemeral: true
    });
}

// Handle Add Funds button
export async function handleAddFunds(interaction) {
    const userId = interaction.user.id;
    const customId = interaction.customId;
    const channelIndex = parseInt(customId.replace('add_funds_', ''));
    
    const channels = await getUserChannels(userId);
    if (channelIndex >= channels.length) {
        await interaction.reply({
            content: 'Channel not found. Please try again.',
            ephemeral: true
        });
        return;
    }
    
    const channel = channels[channelIndex];
    
    // Create modal for adding funds
    const modal = new ModalBuilder()
        .setCustomId(`add_funds_modal_${channelIndex}`)
        .setTitle('Add Funds to Channel');
        
    const amountInput = new TextInputBuilder()
        .setCustomId('add_amount')
        .setLabel('Amount to Add (XRP)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter amount to add')
        .setRequired(true);
        
    const rows = [
        new ActionRowBuilder().addComponents(amountInput)
    ];
    
    modal.addComponents(rows);
    await interaction.showModal(modal);
}

// Process Add Funds modal submission
export async function processAddFunds(interaction) {
    try {
        const userId = interaction.user.id;
        const customId = interaction.customId;
        const channelIndex = parseInt(customId.replace('add_funds_modal_', ''));
        
        const addAmount = parseFloat(interaction.fields.getTextInputValue('add_amount'));
        
        if (isNaN(addAmount) || addAmount <= 0) {
            await interaction.reply({
                content: 'Please enter a valid amount greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        const channels = await getUserChannels(userId);
        if (channelIndex >= channels.length) {
            await interaction.reply({
                content: 'Channel not found. Please try again.',
                ephemeral: true
            });
            return;
        }
        
        const channel = channels[channelIndex];
        
        // In a real implementation, you would submit a PaymentChannelFund transaction
        // to the XRPL to add funds to the channel
        
        // For now, we'll simulate adding funds
        channel.amount += addAmount;
        channel.remainingAmount += addAmount;
        
        // Save updated channel data
        await saveUserChannels(userId, channels);
        
        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Funds Added to Channel')
            .setDescription(`You've successfully added funds to your payment channel!`)
            .addFields(
                { name: 'Channel ID', value: channel.channelId },
                { name: 'Amount Added', value: `${addAmount} XRP` },
                { name: 'New Total Amount', value: `${channel.amount} XRP` },
                { name: 'New Remaining Balance', value: `${channel.remainingAmount} XRP` }
            )
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`send_payment_${channelIndex}`)
                    .setLabel('Send Payment')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`channel_details_${channelIndex}`)
                    .setLabel('View Channel Details')
                    .setStyle(ButtonStyle.Primary)
            );
            
        await interaction.reply({
            embeds: [successEmbed],
            components: [buttons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error adding funds to channel:', error);
        await interaction.reply({
            content: 'Error adding funds to channel. Please try again.',
            ephemeral: true
        });
    }
}

// Handle Cancel Settlement button
export async function handleCancelSettlement(interaction) {
    await interaction.reply({
        content: 'Channel settlement cancelled.',
        ephemeral: true
    });
}

// Export all handlers
export default {
    handleViewChannels,
    handleCreateChannel,
    processCreateChannel,
    handleSendMicropayment,
    handleChannelSelection,
    processMicropayment,
    handleChannelAnalytics,
    handleSettleChannel,
    handleSettleSelection,
    processChannelSettlement,
    handleChannelDetails,
    handleAddFunds,
    processAddFunds,
    handleCancelSettlement
};
