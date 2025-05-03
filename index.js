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
    TextInputStyle,
    StringSelectMenuBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { handleCheckBalance } from './features/checkBalance.js';
import { handleTransactionHistory } from './features/transactionHistory.js';
import { handleEscrowStatus } from './features/escrowStatus.js';
import { handleNFTHoldings } from './features/nftHoldings.js';
import { handleTransactionDecode } from './features/transactionDecoder.js';
import { handleCreateWallet, handleWalletInfoDownload } from './features/createWallet.js';
import QRCode from 'qrcode';
import { 
    showConnectWalletOptions, 
    showConnectWalletModal, 
    handleConnectWallet, 
    showWalletManagement,
    showDisconnectWalletSelector,
    disconnectWallet
} from './features/walletManager.js';
import {
    handleNFTLookup,
    handleNFTRarity,
    handleNFTCollection,
    handleNFTPortfolio,
    handleNFTCompare,
    handleNFTMarket,
    handleNFTHub,
    processNFTLookup,
    processNFTRarity,
    processNFTCollection,
    processNFTPortfolio,
    processNFTCompare
} from './features/nftAnalyzer.js';
import { createConnectionRequest, checkConnectionStatus } from './features/xamanIntegration.js';
import trustLineManager from './features/trustLineManager.js';
import {
    handleOrderBook,
    handleQuickTrade,
    handleMyOrders,
    handleOrderBookPairSelect,
    handleQuickTradeType,
    handleQuickTradePair,
    handleCancelOrder,
    processQuickTrade,
    processCancelOrder
} from './features/dexTrading.js';
import { setupWalletSessionTimeout } from './features/walletManager.js';
import {
    handlePhishingCheck,
    handleTransactionVerification,
    handleSecurityAudit,
    handleActivityMonitor,
    handleTrustlineSafety,
    handleSecurityResources,
    processPhishingCheck,
    processTransactionVerification,
    processSecurityAudit,
    processActivityMonitor,
    processTrustlineSafety
} from './features/securityTools.js';
import {
    handleCBDCInfo,
    handleCBDCBalance,
    handleCBDCSwap,
    handleCBDCCompliance,
    handleCBDCChannels,
    handleCBDCAnalytics,
    showCBDCDetails,
    showCBDCBalanceCheck,
    handleCBDCSwapFrom,
    showCBDCSwapInterface,
    showSwapAmountModal,
    processSwapAmount,
    showCBDCCompliance,
    showCBDCChannelSetup,
    processCBDCBalanceCheck
} from './features/cbdcManager.js';
import * as xrpl from 'xrpl';
import { ValidatorHealthMonitor } from './src/services/validatorHealthMonitor.js';
import { DeveloperEcosystemPulse } from './src/services/developerEcosystemPulse.js';
import serviceManager from './src/services/serviceManager.js';
import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { getServerDonationSetup } from './features/tipSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Add global error handling for XRPL client connections
const setupXrplErrorHandling = (client) => {
    client.on('error', (error) => {
        console.log('XRPL client error:', error);
    });
    
    client.on('disconnected', (code) => {
        console.log('XRPL connection lost. Code:', code);
    });
    
    client.on('reconnect', (error) => {
        console.log('XRPL client reconnecting:', error);
    });
    
    // Add specific handler for noPermission error
    if (client.connection) {
        client.connection.on('noPermission', (error) => {
            console.log('XRPL client permission error:', error);
        });
    }
    
    return client;
};

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'interactions', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    // Convert the file path to a proper URL format
    const fileUrl = new URL(`file://${filePath}`).href;
    
    try {
        const command = await import(fileUrl);
        
        if (command.default && command.default.data) {
            // Handle default export
            client.commands.set(command.default.data.name, command.default);
            console.log(`Loaded command: ${command.default.data.name}`);
        } else if (command.data) {
            // Handle direct export
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] Command at ${filePath} is missing a required "data" property.`);
        }
    } catch (error) {
        console.error(`Error loading command from ${filePath}:`, error);
    }
}

const deployCommands = async () => {
  try {
    const commands = [];
    
    // Add all your remaining commands to the array
    client.commands.forEach(command => {
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    });

    console.log(`Deploying ${commands.length} commands...`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    // Replace CLIENT_ID with your actual client ID
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Successfully redeployed application commands');
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
};

// Call the function
await deployCommands();

// Direct balance check without asking for address
async function handleDirectBalanceCheck(interaction, walletAddress) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const client = setupXrplErrorHandling(new xrpl.Client('wss://xrplcluster.com'));
        await client.connect();
        
        // Get account info for XRP balance
        const accountInfo = await client.request({
            command: 'account_info',
            account: walletAddress,
            ledger_index: 'validated'
        });
        
        // Calculate XRP balance
        const xrpBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
        
        // Get account lines (trust lines) for other tokens
        const accountLines = await client.request({
            command: 'account_lines',
            account: walletAddress
        });
        
        // Create embed with balance information
        const embed = new EmbedBuilder()
            .setTitle(`💼 Wallet Balance`)
            .setDescription(`**Address:** \`${walletAddress}\``)
            .setColor('#00ff00')
            .addFields(
                { 
                    name: '💰 XRP Balance', 
                    value: `**${parseFloat(xrpBalance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                    })} XRP**`, 
                    inline: false 
                }
            );
        
        // Function to convert hex to readable text if applicable
        function formatCurrency(currencyCode) {
            // If it's already a standard currency code (3-character)
            if (/^[A-Za-z0-9]{3}$/.test(currencyCode)) {
                return currencyCode;
            }
            
            // Check if it's a hex representation of ASCII
            if (/^[0-9A-F]{40}$/i.test(currencyCode)) {
                try {
                    // Convert hex to ASCII and remove null bytes
                    let ascii = '';
                    for (let i = 0; i < currencyCode.length; i += 2) {
                        const hexPair = currencyCode.substr(i, 2);
                        const charCode = parseInt(hexPair, 16);
                        if (charCode !== 0) { // Skip null bytes
                            ascii += String.fromCharCode(charCode);
                        }
                    }
                    // If we got a readable string, use it
                    if (/^[A-Za-z0-9.+_-]+$/.test(ascii)) {
                        return ascii.trim();
                    }
                } catch (e) {
                    // If conversion fails, fall back to original
                }
            }
            
            // Known token mappings for common hex codes
            const knownTokens = {
                '5045504500000000000000000000000000000000': 'PEPE',
                '544F544F00000000000000000000000000000000': 'TOTO',
                '5349474D41000000000000000000000000000000': 'SIGMA',
                '62756C6C00000000000000000000000000000000': 'BULL',
                '4861626962690000000000000000000000000000': 'HABIBI',
                '03A3C43A269186A89299C637C1DC06C9F1F586CF': 'SOLO'
                // Add more mappings as needed
            };
            
            return knownTokens[currencyCode] || (currencyCode.length > 10 ? currencyCode.substring(0, 6) + '...' : currencyCode);
        }
        
        // Known issuers mapping
        const knownIssuers = {
            'rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX': 'DRX Official',
            'rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz': 'Sologenic',
            // Add more mappings as needed
        };
        
        // Add token balances if they exist
        if (accountLines.result.lines && accountLines.result.lines.length > 0) {
            // Filter for non-zero balances
            const nonZeroLines = accountLines.result.lines.filter(line => parseFloat(line.balance) !== 0);
            
            // Prepare verified and other tokens
            let verifiedTokensText = '';
            let otherTokensText = '';
            
            // Sort by balance value (highest first)
            nonZeroLines.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
            
            nonZeroLines.forEach(line => {
                const formattedCurrency = formatCurrency(line.currency);
                const formattedBalance = parseFloat(line.balance).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6
                });
                
                // Get issuer info
                let issuerInfo = knownIssuers[line.account] || `${line.account.substring(0, 8)}...`;
                
                // Format the line
                const tokenLine = `**${formattedBalance}** ${formattedCurrency} (${issuerInfo})`;
                
                // Add to appropriate category
                if (knownIssuers[line.account]) {
                    verifiedTokensText += `• ${tokenLine}\n`;
                } else {
                    otherTokensText += `• ${tokenLine}\n`;
                }
            });
            
            // Add verified tokens field if any
            if (verifiedTokensText) {
                embed.addFields({ 
                    name: '✅ Verified Tokens', 
                    value: verifiedTokensText, 
                    inline: false 
                });
            }
            
            // Add other tokens field if any
            if (otherTokensText) {
                embed.addFields({ 
                    name: '🪙 Other Tokens', 
                    value: otherTokensText, 
                    inline: false 
                });
            }
        } else {
            embed.addFields({
                name: '🪙 Token Balances',
                value: 'No tokens found in this wallet',
                inline: false
            });
        }
        
        // Get NFTs if any
        try {
            const nftResponse = await client.request({
                command: 'account_nfts',
                account: walletAddress
            });
            
            if (nftResponse.result.account_nfts && nftResponse.result.account_nfts.length > 0) {
                const nftCount = nftResponse.result.account_nfts.length;
                embed.addFields({
                    name: '🖼️ NFTs',
                    value: `This wallet holds **${nftCount}** NFT${nftCount !== 1 ? 's' : ''}`,
                    inline: false
                });
            }
        } catch (nftError) {
            console.log('Error fetching NFTs (may not be supported):', nftError.message);
        }
        
        // Add a footer with timestamp
        embed.setFooter({ text: 'Balance as of' })
             .setTimestamp();
        
        // Add a thumbnail
        embed.setThumbnail('https://cryptologos.cc/logos/xrp-xrp-logo.png');
        
        await interaction.editReply({ embeds: [embed] });
        await client.disconnect();
    } catch (error) {
        console.error('Error in direct balance check:', error);
        if (interaction.deferred) {
            await interaction.editReply({ content: `Error checking balance: ${error.message}` });
        } else {
            await interaction.reply({ content: `Error checking balance: ${error.message}`, ephemeral: true });
        }
    }
}

// Direct transaction history without asking for address
async function handleDirectTransactionHistory(interaction, walletAddress) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const client = new xrpl.Client('wss://xrplcluster.com');
        await client.connect();
        
        const accountTx = await client.request({
            command: 'account_tx',
            account: walletAddress,
            limit: 10
        });
        
        const transactions = accountTx.result.transactions.map(tx => {
            const txType = tx.tx.TransactionType;
            const date = new Date(xrpl.rippleTimeToUnixTime(tx.tx.date) * 1000).toLocaleString();
            let description = `Type: ${txType}`;
            
            if (txType === 'Payment') {
                const amount = tx.tx.Amount ? 
                    (typeof tx.tx.Amount === 'string' ? 
                        `${xrpl.dropsToXrp(tx.tx.Amount)} XRP` : 
                        `${tx.tx.Amount.value} ${tx.tx.Amount.currency}`) : 
                    'Unknown';
                
                description += ` | Amount: ${amount}`;
                description += ` | To: ${tx.tx.Destination.substring(0, 8)}...`;
            }
            
            return `• ${date}: ${description}`;
        });
        
        const embed = new EmbedBuilder()
            .setTitle(`Transaction History: ${walletAddress.substring(0, 8)}...`)
            .setColor('#0099ff')
            .setDescription(transactions.length > 0 ? 
                transactions.join('\n') : 
                'No recent transactions found');
        
        await interaction.editReply({ embeds: [embed] });
        await client.disconnect();
    } catch (error) {
        console.error('Error in direct transaction history:', error);
        if (interaction.deferred) {
            await interaction.editReply({ content: `Error fetching transaction history: ${error.message}` });
        } else {
            await interaction.reply({ content: `Error fetching transaction history: ${error.message}`, ephemeral: true });
        }
    }
}

// Direct trust lines without asking for address
async function handleDirectTrustLines(interaction, walletAddress) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const client = new xrpl.Client('wss://xrplcluster.com');
        await client.connect();
        
        const accountLines = await client.request({
            command: 'account_lines',
            account: walletAddress
        });
        
        const trustlines = accountLines.result.lines || [];
        
        const embed = new EmbedBuilder()
            .setTitle(`Trust Lines: ${walletAddress.substring(0, 8)}...`)
            .setColor('#0099ff');
        
        if (trustlines.length > 0) {
            const formattedLines = trustlines.map(line => 
                `• ${line.currency}: ${line.balance} (Issuer: ${line.account.substring(0, 8)}...)`
            );
            
            embed.setDescription(formattedLines.join('\n'));
        } else {
            embed.setDescription('No trust lines found for this account.');
        }
        
        await interaction.editReply({ embeds: [embed] });
        await client.disconnect();
    } catch (error) {
        console.error('Error in direct trust lines:', error);
        if (interaction.deferred) {
            await interaction.editReply({ content: `Error fetching trust lines: ${error.message}` });
        } else {
            await interaction.reply({ content: `Error fetching trust lines: ${error.message}`, ephemeral: true });
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        console.log(`Command executed: ${interaction.commandName}`);
        
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await interaction.reply({ 
                content: 'There was an error executing this command!', 
                ephemeral: true 
            });
        }
    }

    if (interaction.isButton()) {
        console.log(`Button interaction received: ${interaction.customId}`);
        
        try {
            // Handle specific button cases with switch
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

                case 'nft_lookup':
                    await handleNFTLookup(interaction);
                    break;

                case 'nft_rarity':
                    await handleNFTRarity(interaction);
                    break;

                case 'view_trust_lines':
                    await trustLineManager.handleTrustLineManager(interaction);
                    break;

                case 'add_trust':
                    await trustLineManager.handleAddTrust(interaction);
                    break;
                
                case 'remove_trust':
                    await trustLineManager.handleRemoveTrust(interaction);
                    break;
                
                case 'modify_limit':
                    await trustLineManager.handleModifyLimit(interaction);
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
                                        .setRequired(true)

                                    const txActionRow = new ActionRowBuilder().addComponents(txAddressInput)
                                    txModal.addComponents(txActionRow)
                                    await interaction.showModal(txModal)
                                    break

                                case 'escrow_status':
                                    const escrowModal = new ModalBuilder()
                                        .setCustomId('escrow_modal')
                                        .setTitle('Check Escrow Status')

                                    const escrowAddressInput = new TextInputBuilder()
                                        .setCustomId('escrow_address_input')
                                        .setLabel('Enter XRPL Address')
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                                        .setRequired(true)

                                    const escrowActionRow = new ActionRowBuilder().addComponents(escrowAddressInput)
                                    escrowModal.addComponents(escrowActionRow)
                                    await interaction.showModal(escrowModal)
                                    break

                                case 'nft_holdings':
                                    const nftModal = new ModalBuilder()
                                        .setCustomId('nft_modal')
                                        .setTitle('View NFT Holdings')

                                    const nftAddressInput = new TextInputBuilder()
                                        .setCustomId('nft_address_input')
                                        .setLabel('Enter XRPL Address')
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                                        .setRequired(true)

                                    const nftActionRow = new ActionRowBuilder().addComponents(nftAddressInput)
                                    nftModal.addComponents(nftActionRow)
                                    await interaction.showModal(nftModal)
                                    break

                                case 'decode_transaction':
                                    const decodeModal = new ModalBuilder()
                                        .setCustomId('decode_modal')
                                        .setTitle('Decode Transaction')

                                    const hashInput = new TextInputBuilder()
                                        .setCustomId('tx_hash_input')
                                        .setLabel('Enter Transaction Hash')
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder('Enter the transaction hash to decode')
                                        .setRequired(true)

                                    const hashRow = new ActionRowBuilder().addComponents(hashInput)
                                    decodeModal.addComponents(hashRow)
                                    await interaction.showModal(decodeModal)
                                    break

                                case 'create_wallet':
                                    await handleCreateWallet(interaction)
                                    break

                                case 'connect_wallet':
                                    await showConnectWalletOptions(interaction)
                                    break

                                case 'connect_with_xaman':
                                    await createConnectionRequest(interaction)
                                    break

                                case 'connect_with_seed':
                                    await showConnectWalletModal(interaction)
                                    break
                
                                case 'manage_wallets':
                                    await showWalletManagement(interaction)
                                    break

                                case 'disconnect_wallet':
                                    await showDisconnectWalletSelector(interaction)
                                    break

                                case 'quick_trade':
                                    await handleQuickTrade(interaction)
                                    break
                
                                case 'order_book':
                                    await handleOrderBook(interaction)
                                    break
                
                                case 'my_orders':
                                    await handleMyOrders(interaction)
                                    break
                
                                case 'quick_trade_buy':
                                    await handleQuickTradeType(interaction, 'buy')
                                    break
                
                                case 'quick_trade_sell':
                                    await handleQuickTradeType(interaction, 'sell')
                                    break
                
                                case 'cancel_order':
                                    await handleCancelOrder(interaction)
                                    break
                
                                case 'refresh_my_orders':
                                    await handleMyOrders(interaction)
                                    break
                
                                case 'token_swap':
                                    await initializeSwap(interaction)
                                    break

                                case 'select_from_token':
                                    await handleTokenSelection(interaction, 'from')
                                    break

                                case 'search_token_from':
                                    await showTokenSearchModal(interaction, 'from')
                                    break
                
                                case 'search_token_to':
                                    await showTokenSearchModal(interaction, 'to')
                                    break

                                case 'back_to_token_selection_from':
                                    await showTokenSelectionInterface(interaction, 'from')
                                    break
                
                                case 'back_to_token_selection_to':
                                    await showTokenSelectionInterface(interaction, 'to')
                                    break

                                case 'phishing_check':
                                    await handlePhishingCheck(interaction)
                                    break

                                case 'verify_transaction':
                                    await handleTransactionVerification(interaction)
                                    break

                                case 'security_audit':
                                    await handleSecurityAudit(interaction)
                                    break

                                case 'activity_monitor':
                                    await handleActivityMonitor(interaction)
                                    break

                                case 'trustline_safety':
                                    await handleTrustlineSafety(interaction)
                                    break

                                case 'security_resources':
                                    await handleSecurityResources(interaction)
                                    break

                                case 'cbdc_info':
                                    await handleCBDCInfo(interaction)
                                    break

                                case 'cbdc_balance':
                                    await handleCBDCBalance(interaction)
                                    break

                                case 'cbdc_swap':
                                    await handleCBDCSwap(interaction)
                                    break

                                case 'cbdc_compliance':
                                    await handleCBDCCompliance(interaction)
                                    break

                                case 'cbdc_channels':
                                    await handleCBDCChannels(interaction)
                                    break

                                case 'cbdc_analytics':
                                    await handleCBDCAnalytics(interaction)
                                    break
                            }

                            // Handle wallet selection for trust line operations
                            if (interaction.customId.startsWith('select_wallet_')) {
                                await trustLineManager.handleWalletSelection(interaction)
                            }
            
                            // Handle connection status check
                            if (interaction.customId.startsWith('check_connection_')) {
                                const connectionId = interaction.customId.replace('check_connection_', '')
                                await checkConnectionStatus(interaction, connectionId)
                            }
            
                            // Handle wallet disconnection
                            if (interaction.customId.startsWith('remove_wallet_')) {
                                const address = interaction.customId.replace('remove_wallet_', '')
                                await disconnectWallet(interaction, address)
                            }
            
                            // Handle order book refresh
                            if (interaction.customId.startsWith('refresh_order_book_')) {
                                const pairName = interaction.customId.replace('refresh_order_book_', '')
                                const pair = { name: pairName }
                                await handleOrderBookPairSelect(interaction, pair)
                            }
            
                            // Handle quick trade pair selection
                            if (interaction.customId.startsWith('quick_trade_pair_')) {
                                const tradeType = interaction.customId.replace('quick_trade_pair_', '')
                                await handleQuickTradePair(interaction, tradeType)
                            }
            
                            // Handle token selection
                            if (interaction.customId.startsWith('select_token_')) {
                                const parts = interaction.customId.split('_')
                                const selectionType = parts[2]
                                const currency = parts[3]
                                const issuer = parts.slice(4).join('_') || ''; // Handle empty issuer for XRP
                                await handleTokenSelection(interaction, selectionType, currency, issuer)
                            }
            
                            // Handle exchange rate check
                            if (interaction.customId.startsWith('check_rate_')) {
                                const parts = interaction.customId.split('_')
                                const fromCurrency = parts[2]
                                const fromIssuer = parts[3] || ''
                                const toCurrency = parts[4]
                                const toIssuer = parts[5] || ''
                                await checkExchangeRate(interaction, fromCurrency, fromIssuer, toCurrency, toIssuer)
                            }
            
                            // Handle swap amount modal
                            if (interaction.customId.startsWith('swap_amount_')) {
                                console.log('Swap amount button clicked:', interaction.customId)
                                const parts = interaction.customId.split('_')
                                const fromTokenIndex = parts[2]
                                const toTokenIndex = parts[3]
                
                                console.log(`Showing amount input modal: from=${fromTokenIndex}, to=${toTokenIndex}`)
                                await showAmountInputModal(interaction, fromTokenIndex, toTokenIndex)
                            }
            
                            // Handle back to swap interface
                            if (interaction.customId.startsWith('back_to_swap_')) {
                                const parts = interaction.customId.split('_')
                                const fromCurrency = parts[3]
                                const fromIssuer = parts[4] || ''
                                const toCurrency = parts[5]
                                const toIssuer = parts[6] || ''
                
                                // Recreate the token objects
                                const fromToken = {
                                    currency: fromCurrency,
                                    issuer: fromIssuer,
                                    name: fromCurrency === 'XRP' ? 'XRP (Native)' : `${fromCurrency} (${fromIssuer.substring(0, 4)}...)`
                                }
                
                                const toToken = {
                                    currency: toCurrency,
                                    issuer: toIssuer,
                                    name: toCurrency === 'XRP' ? 'XRP (Native)' : `${toCurrency} (${toIssuer.substring(0, 4)}...)`
                                }
                
                                await showSwapInterface(interaction, fromToken, toToken)
                            }
            
                            // Handle swap execution
                            if (interaction.customId.startsWith('execute_swap_')) {
                                const parts = interaction.customId.split('_')
                                const fromCurrency = parts[2]
                                const fromIssuer = parts[3] || ''
                                const toCurrency = parts[4]
                                const toIssuer = parts[5] || ''
                                const fromAmount = parts[6]
                                const walletAddress = parts[7]
                
                                await executeSwap(interaction, fromCurrency, fromIssuer, toCurrency, toIssuer, fromAmount, walletAddress)
                            }
            
                            // Handle cancel order
                            if (interaction.customId.startsWith('cancel_order_')) {
                                const sequence = interaction.customId.replace('cancel_order_', '')
                                await processCancelOrder(interaction, sequence)
                            }
            
                            if (interaction.customId.startsWith('select_token_from_')) {
                                console.log('From token selected:', interaction.customId)
                                const tokenIndex = interaction.customId.replace('select_token_from_', '')
                
                                // Store the selected "from" token
                                interaction.client.fromTokenIndex = tokenIndex
                
                                // IMPORTANT: Check if the interaction has already been deferred
                                try {
                                    // Only defer if not already deferred
                                    if (!interaction.deferred && !interaction.replied) {
                                        await interaction.deferUpdate()
                                    }
                    
                                    const toSelectionEmbed = new EmbedBuilder()
                                        .setColor('#0099ff')
                                        .setTitle('Select Destination Token')
                                        .setDescription('Choose which token you want to receive')
                                        .setTimestamp()
                    
                                    // Create buttons for token selection using our static list
                                    const rows = []
                                    let currentRow = new ActionRowBuilder()
                                    let buttonCount = 0
                    
                                    // Import the token list
                                    const { tokenList } = await import('./data/tokenList.js')
                    
                                    // Add buttons for each token in our static list
                                    for (let i = 0; i < tokenList.length; i++) {
                                        const token = tokenList[i]
                        
                                        // Format the button label
                                        const buttonLabel = token.shortName || token.name
                        
                                        currentRow.addComponents(
                                          new ButtonBuilder()
                                            .setCustomId(`select_token_to_${i}`)
                                            .setLabel(buttonLabel)
                                            .setEmoji(token.icon || "🪙")
                                            .setStyle(ButtonStyle.Primary)
                                        )
                        
                                        buttonCount++
                        
                                        // Create a new row after every 3 buttons
                                        if (buttonCount % 3 === 0) {
                                          rows.push(currentRow)
                                          currentRow = new ActionRowBuilder()
                                        }
                                    }
                    
                                    // Add the last row if it has any buttons
                                    if (currentRow.components.length > 0) {
                                      rows.push(currentRow)
                                    }
                    
                                    // Add navigation buttons if needed
                                    if (rows.length > 0) {
                                      const navRow = new ActionRowBuilder()
                                        .addComponents(
                                          new ButtonBuilder()
                                            .setCustomId('token_swap')
                                            .setLabel('Back')
                                            .setStyle(ButtonStyle.Secondary)
                                        )
                      
                                      rows.push(navRow)
                                    }
                    
                                    // Use editReply instead of reply since we've already deferred
                                    async function safeReply(interaction, options) {
                                      try {
                                        if (interaction.deferred) {
                                          return await interaction.editReply(options)
                                        } else if (interaction.replied) {
                                          return await interaction.followUp(options)
                                        } else {
                                          return await interaction.reply(options)
                                        }
                                      } catch (error) {
                                        console.error('Error in safeReply:', error)
                                      }
                                    }
                                    await safeReply(interaction, {
                                      embeds: [toSelectionEmbed],
                                      components: rows,
                                      ephemeral: true
                                    })
                                } catch (error) {
                                    console.error('Error handling from token selection:', error)
                                    // Handle the error appropriately
                                }
                            }
            
                            if (interaction.customId.startsWith('select_token_to_')) {
                                console.log('To token selected:', interaction.customId)
                                const toTokenIndex = interaction.customId.replace('select_token_to_', '')
                                const fromTokenIndex = interaction.client.fromTokenIndex
                
                                if (!fromTokenIndex) {
                                    await interaction.reply({
                                        content: 'Error: Source token not selected. Please start over.',
                                        ephemeral: true
                                    });
                                    return;
                                }
                                
                                await showSwapInterface(interaction, fromTokenIndex, toTokenIndex);
                            }
                            
                            // Direct balance check (no modal)
                            if (interaction.customId.startsWith('direct_balance_')) {
                                const address = interaction.customId.replace('direct_balance_', '');
                                await handleDirectBalanceCheck(interaction, address);
                            }
                            
                            // Direct transaction history (no modal)
                            if (interaction.customId.startsWith('direct_history_')) {
                                const address = interaction.customId.replace('direct_history_', '');
                                await handleDirectTransactionHistory(interaction, address);
                            }
                            
                            // Direct trust lines (no modal)
                            if (interaction.customId.startsWith('direct_trustlines_')) {
                                const address = interaction.customId.replace('direct_trustlines_', '');
                                await handleDirectTrustLines(interaction, address);
                            }
                            
                            if (interaction.customId.startsWith('cbdc_track_')) {
                                const cbdcId = interaction.customId.replace('cbdc_track_', '');
                                await interaction.reply({
                                    content: `You are now tracking updates for ${cbdcData[cbdcId].name}. You will be notified of any significant changes.`,
                                    ephemeral: true
                                });
                            }
                            
                            if (interaction.customId.startsWith('cbdc_swap_amount_')) {
                                const [_, fromCbdcId, toCbdcId] = interaction.customId.split('_').slice(2);
                                await showSwapAmountModal(interaction, fromCbdcId, toCbdcId);
                            }
                            
                            if (interaction.customId.startsWith('cbdc_create_channel_')) {
                                const cbdcId = interaction.customId.replace('cbdc_create_channel_', '');
                                // Show channel creation modal (implementation would be similar to other modals)
                                await interaction.reply({
                                    content: `Channel creation for ${cbdcData[cbdcId].name} will be implemented in a future update.`,
                                    ephemeral: true
                                });
                            }
                            
                            if (interaction.customId.startsWith('cbdc_view_channels_')) {
                                const cbdcId = interaction.customId.replace('cbdc_view_channels_', '');
                                // Show user's existing channels (implementation would fetch from database)
                                await interaction.reply({
                                    content: `Viewing existing channels for ${cbdcData[cbdcId].name} will be implemented in a future update.`,
                                    ephemeral: true
                                });
                            }
                            if (interaction.customId.startsWith('pay_qr_') ||
                                interaction.customId.startsWith('pay_xaman_') ||
                                interaction.customId.startsWith('pay_wallet_') ||
                                interaction.customId.startsWith('confirm_payment_')) {
                                const tipCommand = client.commands.get('tip');
                                await tipCommand.handleTipButtonInteraction(interaction);
                            }
                            if (interaction.customId.startsWith('tip_')) {
                                const parts = interaction.customId.split('_');
                                const action = parts[1];
                                const address = parts[2];
                                
                                if (action === 'xaman') {
                                    // Create Xaman payment link
                                    const xamanLink = `https://xumm.app/detect/xrp?to=${address}`;
                                    
                                    await interaction.reply({
                                        content: `**Pay with Xaman Wallet**\n\nOpen this link or scan the QR code to donate to the server:\n${xamanLink}`,
                                        ephemeral: true
                                    });
                                } 
                                else if (action === 'qr') {
                                    // Generate QR code for wallet address
                                    const QRCode = await import('qrcode');
                                    const { AttachmentBuilder } = await import('discord.js');
                                    
                                    const qrBuffer = await QRCode.toBuffer(`https://xumm.app/detect/xrp?to=${address}`);
                                    const qrAttachment = new AttachmentBuilder(qrBuffer, { name: 'donation_qr.png' });
                                    
                                    await interaction.reply({
                                        content: `**Scan this QR code to donate**\nAddress: \`${address}\``,
                                        files: [qrAttachment],
                                        ephemeral: true
                                    });
                                }
                                else if (action === 'custom') {
                                    // Show modal for custom amount
                                    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
                                    
                                    const modal = new ModalBuilder()
                                        .setCustomId(`tip_custom_amount_${address}`)
                                        .setTitle('Enter Custom Amount');
                                        
                                    const amountInput = new TextInputBuilder()
                                        .setCustomId('tip_amount')
                                        .setLabel('Amount in XRP')
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder('Enter amount (e.g. 20)')
                                        .setRequired(true);
                                        
                                    const amountRow = new ActionRowBuilder().addComponents(amountInput);
                                    modal.addComponents(amountRow);
                                    
                                    await interaction.showModal(modal);
                                }
                                else if (action === 'wallet') {
                                    // Show connect wallet message
                                    await interaction.reply({
                                        content: "To use your connected wallet, please make sure you've connected a wallet using the `/wallet` command first.",
                                        ephemeral: true
                                    });
                                }
                                else if (!isNaN(action)) {
                                    // It's a numeric amount
                                    const amount = action;
                                    const dropsAmount = String(Number(amount) * 1000000);
                                    const xamanLink = `https://xumm.app/detect/xrp?to=${address}&amount=${dropsAmount}`;
                                    
                                    await interaction.reply({
                                        content: `**Donate ${amount} XRP**\n\nOpen this link to send your donation:\n${xamanLink}`,
                                        ephemeral: true
                                    });
                                }
                                
                                return; // Important: return to prevent continuing to other handlers
                            }
                            // Handle custom tip amount modal
                            if (interaction.customId.startsWith('tip_custom_amount_')) {
                                const address = interaction.customId.replace('tip_custom_amount_', '');
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
                                
                                // Create payment link
                                const dropsAmount = String(numAmount * 1000000);
                                const xamanLink = `https://xumm.app/detect/xrp?to=${address}&amount=${dropsAmount}`;
                                
                                await interaction.reply({
                                    content: `**Donate ${numAmount} XRP**\n\nOpen this link to send your donation:\n${xamanLink}`,
                                    ephemeral: true
                                });
                            }
                        } catch (error) {
                            console.error('Error handling button interaction:', error);
                            try {
                                if (!interaction.replied && !interaction.deferred) {
                                    await interaction.reply({
                                        content: 'An error occurred. Please try again.',
                                        ephemeral: true
                                    });
                                } else {
                                    await interaction.editReply({
                                        content: 'An error occurred. Please try again.',
                                        ephemeral: true
                                    });
                                }
                            } catch (replyError) {
                                console.error('Error sending error reply:', replyError);
                            }
                        }
                    }
                    
                    if (interaction.isModalSubmit()) {
                        try {
                            console.log(`Modal submitted: ${interaction.customId}`);
                            
                            if (interaction.customId === 'setup_donations_debug') {
                                console.log("Debug modal submitted!");
                                const address = interaction.fields.getTextInputValue('donation_address');
                                await interaction.reply({
                                    content: `Donation address received: ${address}`,
                                    ephemeral: true
                                });
                                return; // Add return to prevent fall-through
                            }
                            
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
                                case 'connect_wallet_modal':
                                    await handleConnectWallet(interaction);
                                    break;
                                case 'phishing_check_modal':
                                    await processPhishingCheck(interaction);
                                    break;
                                case 'verify_tx_modal':
                                    await processTransactionVerification(interaction);
                                    break;
                                case 'security_audit_modal':
                                    await processSecurityAudit(interaction);
                                    break;
                                case 'activity_monitor_modal':
                                    await processActivityMonitor(interaction);
                                    break;
                                case 'trustline_safety_modal':
                                    await processTrustlineSafety(interaction);
                                    break;
                                case 'nft_lookup_modal':
                                    await processNFTLookup(interaction);
                                    break;
                                case 'nft_rarity_modal':
                                    await processNFTRarity(interaction);
                                    break;
                                case 'nft_collection_modal':
                                    await processNFTCollection(interaction);
                                    break;
                                case 'nft_portfolio_modal':
                                    await processNFTPortfolio(interaction);
                                    break;
                                case 'nft_compare_modal':
                                    await processNFTCompare(interaction);
                                    break;
                                case 'setup_donations_modal':
                                    try {
                                        console.log("Donation setup modal submitted");
                                        const donationAddress = interaction.fields.getTextInputValue('donation_address');
                                        const purpose = interaction.fields.getTextInputValue('donation_purpose');
                                        const message = interaction.fields.getTextInputValue('donation_message') || "";
                                        
                                        // Validate XRPL address
                                        if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(donationAddress)) {
                                            await interaction.reply({
                                                content: 'Invalid XRPL address format. Please try again with a valid address.',
                                                ephemeral: true
                                            });
                                            return;
                                        }
                                        
                                        // Save donation setup
                                        const serverId = interaction.guildId;
                                        
                                        // Read current data
                                        const fs = await import('fs/promises');
                                        const path = await import('path');
                                        const { fileURLToPath } = await import('url');
                                        
                                        const __filename = fileURLToPath(import.meta.url);
                                        const __dirname = path.dirname(__filename);
                                        const DONATIONS_FILE = path.join(__dirname, 'data', 'donations.json');
                                        
                                        let donations;
                                        try {
                                            const data = await fs.readFile(DONATIONS_FILE, 'utf8');
                                            donations = JSON.parse(data);
                                        } catch (error) {
                                            // If file doesn't exist or is invalid, start fresh
                                            donations = { servers: {} };
                                        }
                                        
                                        // Update with new info
                                        donations.servers[serverId] = {
                                            address: donationAddress,
                                            purpose: purpose,
                                            message: message,
                                            setupBy: interaction.user.id,
                                            setupDate: new Date().toISOString()
                                        };
                                        
                                        // Write back to file
                                        await fs.writeFile(DONATIONS_FILE, JSON.stringify(donations, null, 2));
                                        
                                        // Reply with success
                                        await interaction.reply({
                                            content: `✅ Donation setup complete!\n**Address:** \`${donationAddress}\`\n**Purpose:** ${purpose}\n\nUsers can now use the \`/tip\` command to support the server.`,
                                            ephemeral: true
                                        });
                                    } catch (error) {
                                        console.error('Error processing donation setup:', error);
                                        await interaction.reply({
                                            content: 'There was an error setting up donations. Please try again.',
                                            ephemeral: true
                                        });
                                    }
                                    break;
                                case 'tip_custom_amount_modal':
                                    const tipCommand = client.commands.get('tip');
                                    await tipCommand.handleTipModalSubmission(interaction);
                                    break;
                            }
                            
                            if (interaction.customId.startsWith('swap_amount_modal_')) {
                                const parts = interaction.customId.split('_');
                                const fromTokenIndex = parts[3];
                                const toTokenIndex = parts[4];
                                
                                console.log(`Handling swap amount modal: from=${fromTokenIndex}, to=${toTokenIndex}`);
                                await handleSwapAmountSubmit(interaction, fromTokenIndex, toTokenIndex);
                            }
                            
                            
                            if (interaction.customId.startsWith('cbdc_balance_modal_')) {
                                const cbdcId = interaction.customId.replace('cbdc_balance_modal_', '');
                                await processCBDCBalanceCheck(interaction, cbdcId);
                            }
                            
                            if (interaction.customId.startsWith('cbdc_swap_modal_')) {
                                const [_, fromCbdcId, toCbdcId] = interaction.customId.split('_').slice(2);
                                await processSwapAmount(interaction, fromCbdcId, toCbdcId);
                            }
                            
                            if (interaction.customId === 'setup_donations_modal') {
                                const setupCommand = client.commands.get('setup-donations');
                                await setupCommand.handleDonationSetup(interaction);
                            }
                        } catch (error) {
                            console.error('Error handling modal submit:', error);
                            try {
                                if (!interaction.replied && !interaction.deferred) {
                                    await interaction.reply({
                                        content: 'An error occurred. Please try again.',
                                        ephemeral: true
                                    });
                                } else {
                                    await interaction.editReply({
                                        content: 'An error occurred. Please try again.',
                                        ephemeral: true
                                    });
                                }
                            } catch (replyError) {
                                console.error('Error sending error reply:', replyError);
                            }
                        }
                    }
                    
                    // Handle select menu interactions
                    if (interaction.isStringSelectMenu()) {
                        console.log(`Select menu used: ${interaction.customId}`);
                        
                        switch (interaction.customId) {
                            case 'order_book_pair_select': {
                                const selectedPair = JSON.parse(interaction.values[0]);
                                await handleOrderBookPairSelect(interaction, selectedPair);
                                break;
                            }
                            
                            if (interaction.customId === 'donation_channel_select') {
                                const setupCommand = client.commands.get('setup-donations');
                                await setupCommand.handleNotificationChannelSelect(interaction);
                            }
                        }
                        
                        // For custom ID patterns that don't fit in the switch
                        if (interaction.customId.startsWith('quick_trade_pair_select_')) {
                            const tradeType = interaction.customId.replace('quick_trade_pair_select_', '');
                            const selectedPair = JSON.parse(interaction.values[0]);
                            await handleQuickTradePair(interaction, tradeType, selectedPair);
                        }
                    }
                });
                // Handle token selection interface
                async function showTokenSelectionInterface(interaction, selectionType) {
                    try {
                        await interaction.deferUpdate();
                        
                        // Import the function from swapManager.js
                        const { showTokenSelectionInterface } = await import('./features/swapManager.js');
                        
                        // Show the token selection interface
                        await showTokenSelectionInterface(interaction, selectionType);
                    } catch (error) {
                        console.error('Error handling token selection:', error);
                        await interaction.editReply({
                            content: 'Error selecting tokens. Please try again.',
                            ephemeral: true
                        });
                    }
                }
                
                // This should only happen ONCE when the bot starts
                client.once('ready', async () => {
                    console.log('Bot is ready!');
                    
                    // Start the service checking interval
                    serviceManager.startChecking();
                    
                    // Initialize service manager
                    console.log('Service Manager status:');
                    serviceManager.checkServices();
                });
                
                // Try with environment variable first
                client.login(process.env.DISCORD_TOKEN)
                    .catch(error => {
                        console.error("Failed to login with environment variable:", error.message);
                        
                        // Never hardcode your token - use environment variables
                        // return client.login("YOUR_TOKEN_HERE");
                    });
                