import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder // Add this import
} from 'discord.js';
import xrpl from 'xrpl';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Store user wallets in memory (in a production app, you'd use a database)
const userWallets = new Map();

// Encryption functions for securing sensitive data
function encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text, key) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Show wallet connection options
export async function showConnectWalletOptions(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔗 Connect XRPL Wallet')
        .setDescription('Choose how you want to connect your wallet:')
        .addFields(
            { 
                name: '📱 Connect with Xaman (Recommended)', 
                value: 'Scan a QR code with your Xaman wallet app - no need to enter your seed' 
            },
            { 
                name: '🔑 Connect with Other Wallet', 
                value: 'Manually enter your wallet address and family seed' 
            }
        );
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('connect_with_xaman')
                .setLabel('Connect with Xaman')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📱'),
            new ButtonBuilder()
                .setCustomId('connect_with_seed')
                .setLabel('Connect with Other Wallet')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔑')
        );
    
    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

// Show wallet connection modal
export async function showConnectWalletModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('connect_wallet_modal')
        .setTitle('Connect XRPL Wallet');

    const addressInput = new TextInputBuilder()
        .setCustomId('wallet_address')
        .setLabel('Wallet Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your XRPL address (r...)')
        .setRequired(true);

    const seedInput = new TextInputBuilder()
        .setCustomId('wallet_seed')
        .setLabel('Family Seed')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your family seed (s...)')
        .setRequired(true);

    const nameInput = new TextInputBuilder()
        .setCustomId('wallet_name')
        .setLabel('Wallet Name (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Give your wallet a name')
        .setRequired(false);

    const rows = [
        new ActionRowBuilder().addComponents(addressInput),
        new ActionRowBuilder().addComponents(seedInput),
        new ActionRowBuilder().addComponents(nameInput)
    ];

    modal.addComponents(rows);
    await interaction.showModal(modal);
}

// Handle wallet connection
export async function handleConnectWallet(interaction) {
    try {
        const address = interaction.fields.getTextInputValue('wallet_address');
        const seed = interaction.fields.getTextInputValue('wallet_seed');
        let name = 'My XRPL Wallet';
        
        try {
            name = interaction.fields.getTextInputValue('wallet_name');
            if (!name) name = `XRPL Wallet (${address.substring(0, 6)}...)`;
        } catch (e) {
            // Name field is optional
        }

        // Validate the address and seed
        try {
            const wallet = xrpl.Wallet.fromSeed(seed);
            if (wallet.address !== address) {
                throw new Error('Address does not match seed');
            }
        } catch (error) {
            return await interaction.reply({
                content: '❌ Invalid wallet credentials. Please check your address and seed.',
                ephemeral: true
            });
        }

        // Encrypt the seed before storing
        const encryptedSeed = encrypt(seed, process.env.ENCRYPTION_KEY);

        // Store the wallet
        await addConnectedWallet(interaction.user.id, {
            name,
            address,
            encryptedSeed,
            connectedVia: 'manual',
            dateAdded: new Date().toISOString()
        });

        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Wallet Connected Successfully')
            .setDescription(`Your wallet has been connected to your Discord account.`)
            .addFields(
                { name: 'Address', value: `${address.substring(0, 10)}...${address.substring(address.length - 5)}` },
                { name: 'Name', value: name },
                { name: 'Connected Via', value: 'Manual Entry' }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error connecting wallet:', error);
        await interaction.reply({
            content: '❌ Failed to connect wallet. Please try again.',
            ephemeral: true
        });
    }
}

// Add a connected wallet
export async function addConnectedWallet(userId, walletData) {
    try {
        // Validate wallet data
        if (!walletData.address || typeof walletData.address !== 'string' || !walletData.address.startsWith('r')) {
            console.error('Invalid wallet address:', walletData.address);
            return false;
        }
        
        // Create directories if they don't exist
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const walletDir = path.join(process.cwd(), 'data', 'wallets');
        
        try {
            await fs.access(walletDir);
        } catch (error) {
            // Directory doesn't exist, create it
            await fs.mkdir(walletDir, { recursive: true });
        }
        
        const userWalletFile = path.join(walletDir, `${userId}.json`);
        
        let wallets = [];
        try {
            // Try to read existing wallets
            const data = await fs.readFile(userWalletFile, 'utf8');
            wallets = JSON.parse(data);
            
            // Ensure wallets is an array
            if (!Array.isArray(wallets)) {
                wallets = [];
            }
        } catch (error) {
            // File doesn't exist or can't be read, use empty array
            wallets = [];
        }
        
        // Check if wallet already exists
        const existingWalletIndex = wallets.findIndex(w => w.address === walletData.address);
        if (existingWalletIndex >= 0) {
            // Update existing wallet
            wallets[existingWalletIndex] = {
                ...wallets[existingWalletIndex],
                ...walletData
            };
        } else {
            // Add new wallet
            wallets.push(walletData);
        }
        
        // Write updated wallets back to file
        await fs.writeFile(userWalletFile, JSON.stringify(wallets, null, 2));
        
        console.log(`Successfully stored wallet ${walletData.address} for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Error storing connected wallet:', error);
        return false;
    }
}

// Get all connected wallets for a user
export async function getConnectedWallets(userId) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const walletFilePath = path.join(__dirname, '..', 'data', 'wallets', `${userId}.json`);
        
        try {
            // Check if file exists
            await fs.access(walletFilePath);
            
            // Read the file
            const data = await fs.readFile(walletFilePath, 'utf8');
            let wallets = JSON.parse(data);
            
            // Ensure wallets is an array
            if (!Array.isArray(wallets)) {
                console.log(`Wallet data for user ${userId} is not an array, returning empty array`);
                return [];
            }
            
            console.log(`Retrieved ${wallets.length} wallets for user ${userId}`);
            return wallets;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, which means no wallets
                console.log(`No wallet file found for user ${userId}`);
                return [];
            } else {
                // Other error
                console.error(`Error reading wallet file for user ${userId}:`, error);
                return [];
            }
        }
    } catch (error) {
        console.error('Error in getConnectedWallets:', error);
        return [];
    }
}

// Get a specific wallet with decrypted seed
export function getDecryptedWallet(userId, address) {
    const wallets = userWallets.get(userId) || [];
    const wallet = wallets.find(w => w.address === address);
    
    if (!wallet) return null;
    
    // If this is a manually connected wallet with a seed
    if (wallet.encryptedSeed) {
        try {
            const seed = decrypt(wallet.encryptedSeed, process.env.ENCRYPTION_KEY);
            return xrpl.Wallet.fromSeed(seed);
        } catch (error) {
            console.error('Error decrypting wallet seed:', error);
            return null;
        }
    }
    
    // For Xaman-connected wallets, we don't have the seed
    return null;
}

// Show wallet management UI
export async function showWalletManagement(interaction) {
    try {
        const userId = interaction.user.id;
        const wallets = await getConnectedWallets(userId);
        
        console.log(`Retrieved ${wallets ? wallets.length : 0} wallets for user ${userId} in showWalletManagement`);
        
        const walletEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔐 Wallet Management')
            .setDescription(`You have ${wallets ? wallets.length : 0} connected wallet(s)`);
        
        if (wallets && wallets.length > 0) {
            wallets.forEach((wallet, index) => {
                walletEmbed.addFields({
                    name: `Wallet ${index + 1}: ${wallet.name || 'Unnamed Wallet'}`,
                    value: `Address: ${wallet.address.substring(0, 10)}...\nConnected via: ${wallet.connectedVia}\nDate Added: ${new Date(wallet.dateAdded).toLocaleDateString()}`
                });
            });
        } else {
            walletEmbed.addFields({
                name: 'No Connected Wallets',
                value: 'You have not connected any wallets yet. Use the "Connect Wallet" button to add a wallet.'
            });
        }
        
        const manageButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('connect_wallet')
                    .setLabel('Connect Another Wallet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('disconnect_wallet')
                    .setLabel('Disconnect Wallet')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖')
            );
        
        await interaction.reply({
            embeds: [walletEmbed],
            components: [manageButtons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error showing wallet management:', error);
        await interaction.reply({
            content: 'Error retrieving wallet information. Please try again later.',
            ephemeral: true
        });
    }
}

// Show wallet selector for operations
export async function showWalletSelector(interaction, action) {
    try {
        const userId = interaction.user.id;
        console.log(`Retrieving wallets for user ${userId} in showWalletSelector`);
        
        const wallets = await getConnectedWallets(userId);
        
        // Check if wallets is an array and has items
        if (!Array.isArray(wallets) || wallets.length === 0) {
            // No wallets found or invalid data
            const noWalletsEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Connected Wallets')
                .setDescription('You need to connect a wallet before you can perform this action.')
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
        
        // Continue with wallet selection if we have wallets
        const walletEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Select a Wallet')
            .setDescription(`Choose which wallet to use for ${action.replace('_', ' ')}`);
        
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;
        
        wallets.forEach((wallet, index) => {
            if (buttonCount === 5) {
                // Discord only allows 5 buttons per row
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
            
            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${action}_wallet_${wallet.address}`)
                    .setLabel(wallet.name || `Wallet ${index + 1}`)
                    .setStyle(ButtonStyle.Primary)
            );
            
            buttonCount++;
        });
        
        // Add the last row if it has buttons
        if (buttonCount > 0) {
            rows.push(currentRow);
        }
        
        await interaction.reply({
            embeds: [walletEmbed],
            components: rows,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in showWalletSelector:', error);
        
        // Send a user-friendly error message
        await interaction.reply({
            content: 'There was an error retrieving your wallets. Please try connecting your wallet again.',
            ephemeral: true
        });
    }
}

// Show disconnect wallet selector
export async function showDisconnectWalletSelector(interaction) {
    try {
        const userId = interaction.user.id;
        let wallets = await getConnectedWallets(userId);
        
        // Ensure wallets is an array
        if (!wallets || !Array.isArray(wallets)) {
            wallets = [];
        }
        
        console.log(`Retrieved ${wallets.length} wallets for user ${userId} in showDisconnectWalletSelector`);
        
        if (wallets.length === 0) {
            await interaction.reply({
                content: 'You have no connected wallets to disconnect.',
                ephemeral: true
            });
            return;
        }
        
        const disconnectEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔌 Disconnect Wallet')
            .setDescription('Select a wallet to disconnect:');
        
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('disconnect_wallet_select')
                    .setPlaceholder('Select a wallet to disconnect')
                    .addOptions(
                        wallets.map((wallet, index) => ({
                            label: `Wallet ${index + 1}: ${wallet.name || wallet.address.substring(0, 10)}...`,
                            description: `Address: ${wallet.address.substring(0, 15)}...`,
                            value: wallet.address
                        }))
                    )
            );
        
        await interaction.reply({
            embeds: [disconnectEmbed],
            components: [selectMenu],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error showing disconnect wallet selector:', error);
        await interaction.reply({
            content: 'Error retrieving wallet information. Please try again later.',
            ephemeral: true
        });
    }
}

// Function to disconnect a wallet
export async function disconnectWallet(interaction, address) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    console.log(`[WALLET_DEBUG] Attempting to disconnect wallet ${address} for user ${userId}`);
    
    // Path to the user's wallet file
    const walletFilePath = path.join(process.cwd(), 'data', 'wallets', `${userId}.json`);
    console.log(`[WALLET_DEBUG] Wallet file path: ${walletFilePath}`);
    
    try {
      // Check if file exists
      try {
        await fs.access(walletFilePath);
        console.log(`[WALLET_DEBUG] Wallet file exists at ${walletFilePath}`);
      } catch (accessError) {
        console.log(`[WALLET_DEBUG] Wallet file does not exist at ${walletFilePath}`);
        await interaction.editReply({
          content: "You don't have any connected wallets."
        });
        return;
      }
      
      // Read the current wallets
      const data = await fs.readFile(walletFilePath, 'utf8');
      console.log(`[WALLET_DEBUG] Read wallet data: ${data}`);
      
      let wallets = JSON.parse(data);
      
      if (!Array.isArray(wallets)) {
        console.error(`[WALLET_DEBUG] Wallet data for user ${userId} is not an array:`, wallets);
        wallets = [];
      }
      
      // Count wallets before removal
      const originalCount = wallets.length;
      console.log(`[WALLET_DEBUG] Original wallet count: ${originalCount}`);
      
      // Filter out the wallet to disconnect
      const newWallets = wallets.filter(wallet => wallet.address !== address);
      console.log(`[WALLET_DEBUG] New wallet count: ${newWallets.length}`);
      
      // Check if any wallet was removed
      if (newWallets.length === originalCount) {
        console.log(`[WALLET_DEBUG] Wallet ${address} not found for user ${userId}`);
        await interaction.editReply({
          content: `Wallet ${address.substring(0, 10)}... not found in your connected wallets.`
        });
        return;
      }
      
      // Save the updated wallets
      await fs.writeFile(walletFilePath, JSON.stringify(newWallets, null, 2));
      console.log(`[WALLET_DEBUG] Wrote updated wallets to file: ${JSON.stringify(newWallets)}`);
      
      // Verify the file was updated correctly
      const verifyData = await fs.readFile(walletFilePath, 'utf8');
      console.log(`[WALLET_DEBUG] Verification read: ${verifyData}`);
      
      console.log(`[WALLET_DEBUG] Successfully disconnected wallet ${address} for user ${userId}. Remaining wallets: ${newWallets.length}`);
      
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Wallet Disconnected')
        .setDescription(`The wallet ${address.substring(0, 10)}... has been disconnected successfully.`)
        .setTimestamp();
      
      await interaction.editReply({
        embeds: [successEmbed]
      });
      
    } catch (error) {
      console.error(`[WALLET_DEBUG] Error in wallet file operations:`, error);
      await interaction.editReply({
        content: `Error disconnecting wallet: ${error.message}. Please try again.`
      });
    }
  } catch (error) {
    console.error('[WALLET_DEBUG] Error in disconnectWallet function:', error);
    
    try {
      await interaction.editReply({
        content: `An unexpected error occurred: ${error.message}. Please try again.`
      });
    } catch (replyError) {
      console.error('[WALLET_DEBUG] Error sending error reply:', replyError);
    }
  }
}

// Make sure this function exists and works correctly
async function saveWallets(userId, wallets) {
    try {
        // Get the current data
        let userData = {};
        
        try {
            // Try to read existing data
            const data = await fs.readFile('./data/wallets.json', 'utf8');
            userData = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist or is invalid, start with empty object
            console.log('No existing wallet data found, creating new data');
            userData = {};
        }
        
        // Update the user's wallets
        userData[userId] = wallets;
        
        // Save the updated data
        await fs.writeFile('./data/wallets.json', JSON.stringify(userData, null, 2));
        console.log(`Saved ${wallets.length} wallets for user ${userId}`);
        
        return true;
    } catch (error) {
        console.error('Error saving wallet data:', error);
        return false;
    }
}

// Add this function to walletManager.js
export async function getConnectedWallet(userId) {
    // Implementation depends on how wallets are stored in your system
    // This is a placeholder - implement according to your storage method
    try {
        // Example implementation - modify based on your actual storage
        const wallets = []; // Replace with actual wallet retrieval logic
        return wallets.length > 0 ? wallets[0] : null;
    } catch (error) {
        console.error('Error getting connected wallet:', error);
        return null;
    }
}

// Add this function to clean up invalid wallet data
export async function cleanupWalletData(userId) {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const walletDir = path.join(process.cwd(), 'data', 'wallets');
        const userWalletFile = path.join(walletDir, `${userId}.json`);
        
        try {
            // Try to read existing wallets
            const data = await fs.readFile(userWalletFile, 'utf8');
            let wallets = JSON.parse(data);
            
            // Ensure wallets is an array
            if (!Array.isArray(wallets)) {
                wallets = [];
            }
            
            // Filter out invalid wallets
            const validWallets = wallets.filter(wallet => 
                wallet && 
                wallet.address && 
                typeof wallet.address === 'string' && 
                wallet.address.startsWith('r')
            );
            
            // Remove duplicates
            const uniqueWallets = [];
            const addressSet = new Set();
            
            for (const wallet of validWallets) {
                if (!addressSet.has(wallet.address)) {
                    addressSet.add(wallet.address);
                    uniqueWallets.push(wallet);
                }
            }
            
            // Write cleaned wallets back to file
            await fs.writeFile(userWalletFile, JSON.stringify(uniqueWallets, null, 2));
            
            console.log(`Cleaned up wallet data for user ${userId}: ${wallets.length} -> ${uniqueWallets.length}`);
            return true;
        } catch (error) {
            // File doesn't exist or can't be read
            console.log(`No wallet file found for user ${userId}`);
            return false;
        }
    } catch (error) {
        console.error('Error cleaning up wallet data:', error);
        return false;
    }
}

// Setting up wallet session timeout system...
export async function setupWalletSessionTimeout() {
  console.log('Setting up wallet session timeout system...');
  
  // Run the cleanup every 15 minutes
  setInterval(async () => {
    await cleanupExpiredWalletSessions();
  }, 15 * 60 * 1000);
  
  // Also run it once at startup
  await cleanupExpiredWalletSessions();
}

async function cleanupExpiredWalletSessions() {
  try {
    console.log('Running wallet session cleanup...');
    
    // Get the wallets directory path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const walletsDir = path.join(__dirname, '..', 'data', 'wallets');
    
    // Check if directory exists
    try {
      await fs.access(walletsDir);
    } catch (error) {
      console.log('Wallets directory does not exist yet, creating it...');
      await fs.mkdir(walletsDir, { recursive: true });
      return; // No files to clean up
    }
    
    // Get all wallet files
    const files = await fs.readdir(walletsDir);
    
    // Process each file
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(walletsDir, file);
        
        try {
          // Read the file
          const data = await fs.readFile(filePath, 'utf8');
          const wallets = JSON.parse(data);
          
          if (!Array.isArray(wallets)) {
            console.log(`File ${file} does not contain a valid wallet array, skipping...`);
            continue;
          }
          
          // Check each wallet for expiration
          const now = Date.now();
          const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
          
          const updatedWallets = wallets.filter(wallet => {
            // Get the wallet's date added or last updated
            const walletDate = wallet.lastUpdated || wallet.dateAdded;
            
            if (!walletDate) {
              console.log(`Wallet ${wallet.address} has no date, keeping it...`);
              return true; // Keep wallets without dates (shouldn't happen)
            }
            
            const walletTimestamp = new Date(walletDate).getTime();
            const age = now - walletTimestamp;
            
            // If wallet is older than 1 hour, remove it
            if (age > ONE_HOUR) {
              console.log(`Wallet ${wallet.address} has expired (${age/ONE_HOUR} hours old), removing...`);
              return false;
            }
            
            return true; // Keep wallets less than 1 hour old
          });
          
          // If wallets were removed, update the file
          if (updatedWallets.length < wallets.length) {
            console.log(`Cleaned up wallet data for user ${file.replace('.json', '')}: ${wallets.length} -> ${updatedWallets.length}`);
            
            if (updatedWallets.length === 0) {
              // If no wallets left, delete the file
              await fs.unlink(filePath);
              console.log(`Deleted empty wallet file: ${file}`);
            } else {
              // Otherwise, update the file with remaining wallets
              await fs.writeFile(filePath, JSON.stringify(updatedWallets, null, 2));
            }
          }
        } catch (error) {
          console.error(`Error processing wallet file ${file}:`, error);
        }
      }
    }
    
    console.log('Wallet data cleanup completed');
  } catch (error) {
    console.error('Error in wallet session cleanup:', error);
  }
}

// Add a function to update wallet timestamps when they're used
export async function updateWalletTimestamp(userId, address) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const walletFilePath = path.join(__dirname, '..', 'data', 'wallets', `${userId}.json`);
    
    try {
      // Read the file
      const data = await fs.readFile(walletFilePath, 'utf8');
      const wallets = JSON.parse(data);
      
      if (!Array.isArray(wallets)) {
        console.log(`Wallet data for user ${userId} is not an array, cannot update timestamp`);
        return;
      }
      
      // Find the wallet and update its timestamp
      const updatedWallets = wallets.map(wallet => {
        if (wallet.address === address) {
          return {
            ...wallet,
            lastUpdated: new Date().toISOString()
          };
        }
        return wallet;
      });
      
      // Save the updated wallets
      await fs.writeFile(walletFilePath, JSON.stringify(updatedWallets, null, 2));
      console.log(`Updated timestamp for wallet ${address} of user ${userId}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`No wallet file found for user ${userId}`);
      } else {
        console.error(`Error updating wallet timestamp for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in updateWalletTimestamp:', error);
  }
}

// Add this function to your walletManager.js file if it doesn't exist
export async function cleanupWalletSessions() {
    try {
        // Get all active wallet sessions
        const sessions = getActiveSessions();
        
        // Get current time
        const now = Date.now();
        
        // Check each session for timeout (30 minutes)
        for (const [userId, session] of sessions.entries()) {
            if (now - session.lastActivity > 30 * 60 * 1000) {
                console.log(`Cleaning up expired wallet session for user ${userId}`);
                sessions.delete(userId);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error cleaning up wallet sessions:', error);
        return false;
    }
}

// Helper function to get active sessions (add if not exists)
function getActiveSessions() {
    // If we don't have a global sessions map, create one
    if (!global.walletSessions) {
        global.walletSessions = new Map();
    }
    
    return global.walletSessions;
}

// After receiving a payload from Xaman/XUMM
async function processXamanSignIn(payload, userId) {
    try {
        // Make sure you're extracting the account correctly
        // INCORRECT:
        // const account = 'Account from TX: ' + payload.txid;
        
        // CORRECT:
        const account = payload.response.account;
        
        // Then proceed with your wallet connection logic
        // ...
        
        // When fetching additional wallet data, use the correct account address
        const client = new xrpl.Client('wss://xrplcluster.com');
        await client.connect();
        
        const accountInfo = await client.request({
            command: 'account_info',
            account: account,  // Use the correct account address
            ledger_index: 'validated'
        });
        
        // Process account info
        // ...
        
        await client.disconnect();
    } catch (error) {
        console.error('Error processing sign-in:', error);
    }
}
