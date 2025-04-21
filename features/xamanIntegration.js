import { XummSdk } from 'xumm-sdk';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import QRCode from 'qrcode';
import crypto from 'crypto';
import xrpl from 'xrpl';

// Initialize Xaman SDK with your API credentials
// You'll need to register at https://apps.xaman.dev to get these
const xaman = new XummSdk(
    process.env.XAMAN_API_KEY,
    process.env.XAMAN_API_SECRET
);

// Test the SDK connection
console.log('Testing Xaman SDK connection...');
xaman.ping().then(pong => {
    console.log('Xaman SDK connection successful:', pong);
}).catch(error => {
    console.error('Xaman SDK connection failed:', error);
});

// Store pending connections
const pendingConnections = new Map();

// Generate a unique connection ID
function generateConnectionId() {
    return crypto.randomBytes(16).toString('hex');
}

// Create a connection request
export async function createConnectionRequest(interaction) {
    try {
        // First, check if the SDK is properly initialized
        if (!xaman) {
            console.error('Xaman SDK not initialized. Check your API credentials.');
            await interaction.reply({
                content: '❌ Failed to initialize Xaman SDK. Please check your API credentials.',
                ephemeral: true
            });
            return;
        }

        // Generate a unique connection ID
        const connectionId = generateConnectionId();
      
        console.log('Attempting to create Xaman payload with simplified approach...');
      
        // Try a simpler payload first
        const payload = {
            txjson: {
                TransactionType: 'SignIn'
            },
            options: {
                signinFlow: true
            }
        };
      
        console.log('Sending simplified payload to Xaman API:', payload);
      
        // Create the payload with Xaman
        const response = await xaman.payload.create(payload);
      
        console.log('Received response from Xaman API:', response);
      
        // Check if response is valid
        if (!response || !response.uuid) {
            console.error('Invalid response from Xaman API:', response);
            await interaction.reply({
                content: '❌ Received invalid response from Xaman API. Please try again later.',
                ephemeral: true
            });
            return;
        }
      
        // Store the pending connection
        pendingConnections.set(connectionId, {
            discordUserId: interaction.user.id,
            interactionId: interaction.id,
            timestamp: Date.now(),
            payloadUuid: response.uuid
        });
      
        // Generate QR code
        const qrBuffer = await QRCode.toBuffer(response.next.always);
        const qrAttachment = new AttachmentBuilder(qrBuffer, { 
            name: 'xaman_connect.png',
            description: 'Scan with Xaman to connect your wallet'
        });
      
        // Create embed with instructions
        const connectEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔗 Connect Your XRPL Wallet')
            .setDescription('Scan this QR code with your Xaman wallet app to connect')
            .addFields(
                { name: 'Connection ID', value: connectionId.substring(0, 8) + '...' },
                { name: 'Expires In', value: '5 minutes' },
                { name: 'Instructions', value: 
                    '1. Open your Xaman app\n' +
                    '2. Scan this QR code\n' +
                    '3. Approve the connection request\n' +
                    '4. Your wallet will be connected to your Discord account'
                }
            )
            .setImage('attachment://xaman_connect.png')
            .setTimestamp();
          
        // Add buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Open in Xaman')
                    .setStyle(ButtonStyle.Link)
                    .setURL(response.next.always),
                new ButtonBuilder()
                    .setCustomId(`check_connection_${connectionId}`)
                    .setLabel('Check Connection Status')
                    .setStyle(ButtonStyle.Primary)
            );
          
        // Reply with the QR code and instructions
        await interaction.reply({
            embeds: [connectEmbed],
            files: [qrAttachment],
            components: [buttons],
            ephemeral: true
        });
      
        // Start monitoring this connection
        startConnectionMonitoring(connectionId, interaction);
      
    } catch (error) {
        console.error('Error creating Xaman connection request:', error);
        await interaction.reply({
            content: `❌ Failed to create connection request: ${error.message}`,
            ephemeral: true
        });
    }
}

// Monitor a connection for completion
async function startConnectionMonitoring(connectionId, interaction) {
    const connection = pendingConnections.get(connectionId);
    if (!connection) return;
    
    try {
        // Subscribe to payload events
        console.log(`Starting to monitor connection ${connectionId}...`);
        const subscription = await xaman.payload.subscribe(connection.payloadUuid);
        
        console.log('Subscription response:', subscription);
        
        // Check if we have a websocket property
        if (subscription.websocket) {
            console.log('Using websocket property for subscription');
            
            // Check if it's a W3CWebSocket (has addEventListener method)
            if (typeof subscription.websocket.addEventListener === 'function') {
                console.log('Using addEventListener for WebSocket events');
                
                subscription.websocket.addEventListener('message', async (event) => {
                    try {
                        console.log('WebSocket message received:', event);
                        
                        // Parse the message data
                        const data = JSON.parse(event.data);
                        console.log('Parsed WebSocket data:', data);
                        
                        // Process the message
                        handlePayloadUpdate(data, connection, interaction, subscription, connectionId);
                    } catch (error) {
                        console.error('Error processing WebSocket message:', error);
                    }
                });
                
                // Set up periodic polling as a backup
                const pollInterval = setInterval(async () => {
                    try {
                        if (!pendingConnections.has(connectionId)) {
                            clearInterval(pollInterval);
                            return;
                        }
                        
                        await pollForStatus(connection.payloadUuid, connection, interaction, subscription, connectionId);
                    } catch (error) {
                        console.error('Error in polling interval:', error);
                    }
                }, 5000); // Poll every 5 seconds
                
                // Clear the polling interval after 5 minutes
                setTimeout(() => {
                    clearInterval(pollInterval);
                }, 5 * 60 * 1000);
            } else {
                console.log('WebSocket does not have addEventListener method, using resolved promise');
                
                // Use the resolved promise
                subscription.resolved.then(result => {
                    console.log('Subscription resolved with result:', result);
                    handlePayloadUpdate(result, connection, interaction, subscription, connectionId);
                }).catch(error => {
                    console.error('Error in subscription resolution:', error);
                });
            }
        } else {
            console.log('No websocket property found, using polling approach');
            
            // Fallback to polling approach
            const checkInterval = setInterval(async () => {
                try {
                    const status = await xaman.payload.get(connection.payloadUuid);
                    console.log(`Polling status for ${connectionId}:`, status);
                    
                    if (status && status.meta && (status.meta.signed === true || status.meta.signed === false)) {
                        clearInterval(checkInterval);
                        handlePayloadUpdate({
                            signed: status.meta.signed,
                            account: status.response?.account,
                            user_token: status.application?.issued_user_token
                        }, connection, interaction, null, connectionId);
                    }
                } catch (error) {
                    console.error('Error polling payload status:', error);
                }
            }, 10000); // Changed from 3000 to 10000 (10 seconds)
            
            // Set a timeout to clear the interval after 5 minutes
            setTimeout(() => {
                clearInterval(checkInterval);
                if (pendingConnections.has(connectionId)) {
                    handleExpiredConnection(interaction, connectionId);
                }
            }, 5 * 60 * 1000);
        }
        
        // Set a timeout to clean up expired connections
        setTimeout(() => {
            if (pendingConnections.has(connectionId)) {
                handleExpiredConnection(interaction, connectionId);
                
                // Close the WebSocket if it's still open
                if (subscription.websocket && typeof subscription.websocket.close === 'function') {
                    subscription.websocket.close();
                }
            }
        }, 5 * 60 * 1000); // 5 minutes
        
    } catch (error) {
        console.error('Error monitoring connection:', error);
    }
}

// Add these helper functions
function handlePayloadUpdate(data, connection, interaction, subscription, connectionId) {
    console.log(`Received payload update for ${connectionId}:`, data);
    
    // Check for different message formats
    if (data.signed !== undefined) {
        // Standard format with signed property
        processSigningResult(data, connection, interaction, subscription, connectionId);
    } else if (data.payload && data.payload.meta && data.payload.meta.signed !== undefined) {
        // Nested payload format
        processSigningResult({
            signed: data.payload.meta.signed,
            account: data.payload.response?.account,
            user_token: data.payload.application?.issued_user_token
        }, connection, interaction, subscription, connectionId);
    } else if (data.message) {
        // Just a status message, not a signing result
        console.log(`Status message received: ${data.message}`);
    } else if (data.expires_in_seconds) {
        // Expiration information
        console.log(`Payload expires in ${data.expires_in_seconds} seconds`);
    } else {
        // Unknown format, try to poll for status
        console.log('Received message in unknown format, polling for status');
        pollForStatus(connection.payloadUuid, connection, interaction, subscription, connectionId);
    }
}

// Process signing results
function processSigningResult(data, connection, interaction, subscription, connectionId) {
    console.log('Processing signing result:', data);
    
    if (data.signed === true) {
        // User signed the request
        // Extract account from data or txid if available
        const account = data.account || (data.txid ? `Account from TX: ${data.txid.substring(0, 8)}...` : 'Unknown');
        
        handleSuccessfulConnection({
            signed: true,
            account: account,
            user_token: data.user_token
        }, connection, interaction);
        
        // Clean up
        pendingConnections.delete(connectionId);
        if (subscription && typeof subscription.websocket?.close === 'function') {
            subscription.websocket.close();
        }
    } else if (data.signed === false || data.cancelled === true) {
        // User rejected or cancelled the request
        handleRejectedConnection(interaction);
        
        // Clean up
        pendingConnections.delete(connectionId);
        if (subscription && typeof subscription.websocket?.close === 'function') {
            subscription.websocket.close();
        }
    }
}

// Poll for status updates
async function pollForStatus(payloadUuid, connection, interaction, subscription, connectionId) {
    try {
        const status = await xaman.payload.get(payloadUuid);
        console.log(`Polled status for ${payloadUuid}:`, status);
        
        // Check if status is null or undefined
        if (!status) {
            console.log(`No status returned for payload ${payloadUuid}`);
            return;
        }
        
        // Check if meta exists
        if (!status.meta) {
            console.log(`No meta data in status for payload ${payloadUuid}`);
            return;
        }
        
        // Check for rejection or cancellation
        if (status.meta.cancelled === true) {
            console.log(`Payload ${payloadUuid} was cancelled`);
            handleRejectedConnection(interaction);
            pendingConnections.delete(connectionId);
            return;
        }
        
        // Check for expiration
        if (status.meta.expired === true) {
            console.log(`Payload ${payloadUuid} has expired`);
            handleExpiredConnection(interaction, connectionId);
            pendingConnections.delete(connectionId);
            return;
        }
        
        // Check for signing status
        if (status.meta.signed === true) {
            console.log(`Payload ${payloadUuid} was signed`);
            
            // Get account from response if available
            const account = status.response?.account || 'Unknown';
            
            handleSuccessfulConnection({
                signed: true,
                account: account,
                user_token: status.application?.issued_user_token
            }, connection, interaction);
            pendingConnections.delete(connectionId);
        } else if (status.meta.signed === false && status.meta.resolved === true) {
            console.log(`Payload ${payloadUuid} was rejected`);
            handleRejectedConnection(interaction);
            pendingConnections.delete(connectionId);
        }
    } catch (error) {
        console.error('Error polling payload status:', error);
    }
}

// Handle successful connection
async function handleSuccessfulConnection(data, connection, interaction) {
    try {
        // Check if account exists, use a default if not
        const address = data.account || 'Unknown Address';
        
        // Only proceed with storing if we have a valid address
        if (address !== 'Unknown Address') {
            // Store the connected wallet
            await storeConnectedWallet(
                connection.discordUserId,
                address,
                `Xaman Wallet (${address.substring(0, 6)}...)`
            );
        }
        
        // Connect to XRPL to get additional wallet information
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        let accountInfo = null;
        let accountLines = null;
        let nftCount = 0;
        
        try {
            // Get account info
            accountInfo = await client.request({
                command: "account_info",
                account: address,
                ledger_index: "validated"
            });
            
            // Get trust lines
            accountLines = await client.request({
                command: "account_lines",
                account: address
            });
            
            // Get NFT count
            const nftResponse = await client.request({
                command: "account_nfts",
                account: address
            });
            
            nftCount = nftResponse.result.account_nfts.length;
        } catch (error) {
            console.error('Error fetching additional wallet data:', error);
        } finally {
            await client.disconnect();
        }
        
        // Create a more attractive success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Wallet Connected Successfully')
            .setDescription(`Your XRPL wallet has been securely connected to your Discord account.`)
            .addFields(
                { 
                    name: '💳 Wallet Address', 
                    value: `\`${address.substring(0, 10)}...${address.substring(address.length - 5)}\``,
                    inline: true 
                },
                { 
                    name: '🔗 Connected Via', 
                    value: 'Xaman Wallet',
                    inline: true 
                }
            )
            .setTimestamp();
            
        // Add account balance if available
        if (accountInfo && accountInfo.result && accountInfo.result.account_data) {
            const xrpBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
            successEmbed.addFields({
                name: '💰 XRP Balance',
                value: `${xrpBalance} XRP`,
                inline: true
            });
        }
        
        // Add token count if available
        if (accountLines && accountLines.result) {
            const tokenCount = accountLines.result.lines.length;
            successEmbed.addFields({
                name: '🪙 Tokens',
                value: `${tokenCount} tokens`,
                inline: true
            });
        }
        
        // Add NFT count
        successEmbed.addFields({
            name: '🎨 NFTs',
            value: `${nftCount} NFTs`,
            inline: true
        });
        
        // Add account flags if available
        if (accountInfo && accountInfo.result && accountInfo.result.account_data) {
            const flags = accountInfo.result.account_data.Flags;
            const flagDescriptions = [];
            
            if (flags & 0x00800000) flagDescriptions.push("• Default Ripple");
            if (flags & 0x00080000) flagDescriptions.push("• Deposit Auth");
            if (flags & 0x00100000) flagDescriptions.push("• Disable Master Key");
            if (flags & 0x00010000) flagDescriptions.push("• Disallow XRP");
            if (flags & 0x00020000) flagDescriptions.push("• Require Auth");
            if (flags & 0x00040000) flagDescriptions.push("• Require Destination Tag");
            
            if (flagDescriptions.length > 0) {
                successEmbed.addFields({
                    name: '⚙️ Account Settings',
                    value: flagDescriptions.join('\n'),
                    inline: false
                });
            }
        }
        
        // Add explorer link
        successEmbed.addFields({
            name: '🔍 View on Explorer',
            value: `[View on XRPL Explorer](https://livenet.xrpl.org/accounts/${address})`,
            inline: false
        });
        
        // Add actions section
        successEmbed.addFields({
            name: '🛠️ Available Actions',
            value: 'Use `/wallet` to check balance, transaction history, and more!',
            inline: false
        });
        
        // Add a footer with a tip
        successEmbed.setFooter({ 
            text: 'Tip: Keep your wallet secure and never share your private keys with anyone.' 
        });
        
        // Create action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`direct_balance_${address}`)  // Include address in the button ID
                    .setLabel('Check Balance')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId(`direct_history_${address}`)  // Include address in the button ID
                    .setLabel('Transaction History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setCustomId(`direct_trustlines_${address}`)  // Include address in the button ID
                    .setLabel('Trust Lines')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤝')
            );
            
        await interaction.editReply({
            embeds: [successEmbed],
            components: [actionRow],
            files: []
        });
    } catch (error) {
        console.error('Error updating interaction:', error);
        
        // Try a simpler update if the detailed one fails
        try {
            const basicEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Wallet Connected Successfully')
                .setDescription('Your wallet has been connected to your Discord account.')
                .setTimestamp();
                
            await interaction.editReply({
                embeds: [basicEmbed],
                files: [],
                components: []
            });
        } catch (secondError) {
            console.error('Failed even with basic embed update:', secondError);
        }
    }
}

// Handle rejected connection
async function handleRejectedConnection(interaction) {
                try {
                    const rejectedEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Connection Rejected')
                        .setDescription('You rejected the wallet connection request.')
                        .setTimestamp()
            
                    await interaction.editReply({
                        embeds: [rejectedEmbed],
                        files: [],
                        components: []
                    })
                } catch (error) {
                    console.error('Error updating interaction:', error)
                }
}

// Handle expired connection
async function handleExpiredConnection(interaction, connectionId) {
                try {
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#ff9900')
                        .setTitle('⏰ Connection Request Expired')
                        .setDescription('The wallet connection request has expired. Please try again.')
                        .setTimestamp()
            
                    await interaction.editReply({
                        embeds: [expiredEmbed],
                        files: [],
                        components: []
                    })
        
                    pendingConnections.delete(connectionId)
                } catch (error) {
                    console.error('Error updating expired interaction:', error)
                }
}

// Check connection status
export async function checkConnectionStatus(interaction, connectionId) {
                const connection = pendingConnections.get(connectionId)
    
                if (!connection) {
                    await interaction.reply({
                        content: '❌ Connection request not found or already completed.',
                        ephemeral: true
                    })
                    return
                }
    
                try {
                    // Get payload status from Xaman
                    const status = await xaman.payload.get(connection.payloadUuid)
        
                    let statusMessage = '⏳ Waiting for wallet connection...'
                    let statusColor = '#ff9900'
        
                    if (status && status.meta) {
                        if (status.meta.signed) {
                            statusMessage = '✅ Connected! Processing your wallet details...'
                            statusColor = '#00ff00'
                        } else if (status.meta.expired) {
                            statusMessage = '⏰ Connection request expired. Please try again.'
                            statusColor = '#ff0000'
                        } else if (status.meta.cancelled) {
                            statusMessage = '❌ Connection request cancelled.'
                            statusColor = '#ff0000'
                        }
                    }
        
                    const statusEmbed = new EmbedBuilder()
                        .setColor(statusColor)
                        .setTitle('Connection Status')
                        .setDescription(statusMessage)
                        .setTimestamp()
            
                    await interaction.reply({
                        embeds: [statusEmbed],
                        ephemeral: true
                    })
        
                } catch (error) {
                    console.error('Error checking connection status:', error)
                    await interaction.reply({
                        content: '❌ Failed to check connection status. Please try again.',
                        ephemeral: true
                    })
                }
}

// Store a connected wallet
async function storeConnectedWallet(userId, address, name) {
    try {
        // Validate the address
        if (!address || typeof address !== 'string' || !address.startsWith('r')) {
            console.error('Invalid wallet address:', address);
            return false;
        }
        
        // Import the wallet manager functions
        const { addConnectedWallet, getConnectedWallets } = await import('./walletManager.js');
        
        // Check if this wallet is already connected
        const existingWallets = await getConnectedWallets(userId);
        if (Array.isArray(existingWallets) && existingWallets.some(w => w.address === address)) {
            console.log(`Wallet ${address} is already connected for user ${userId}`);
            return true; // Already connected, no need to add again
        }
        
        // Add the wallet to the user's connected wallets
        await addConnectedWallet(userId, {
            name,
            address,
            connectedVia: 'xaman',
            dateAdded: new Date().toISOString()
        });
        
        console.log(`Successfully stored wallet ${address} for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Error storing connected wallet:', error);
        return false;
    }
}