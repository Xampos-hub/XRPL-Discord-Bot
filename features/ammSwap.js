import { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} from 'discord.js';
import xrpl from 'xrpl';
import { getConnectedWallet } from './walletManager.js';

// Handle the swap token button click
export async function handleAmmSwap(interaction, ammAccountId) {
    // Check if user has a connected wallet
    const userId = interaction.user.id;
    const wallet = await getConnectedWallet(userId);
    
    if (!wallet) {
        const noWalletEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ No Connected Wallet')
            .setDescription('You need to connect a wallet before you can swap tokens.')
            .addFields(
                { name: 'How to Connect', value: 'Use the `/wallet` command and select "Connect Wallet".' }
            );
            
        await interaction.reply({
            embeds: [noWalletEmbed],
            ephemeral: true
        });
        return;
    }
    
    // Create the swap modal
    const modal = new ModalBuilder()
        .setCustomId(`amm_swap_modal_${ammAccountId}`)
        .setTitle('Swap Tokens');
        
    // Get AMM info to show available tokens
    const client = new xrpl.Client("wss://s1.ripple.com");
    await client.connect();
    
    try {
        const ammInfo = await client.request({
            command: "amm_info",
            amm_account: ammAccountId
        });
        
        const amm = ammInfo.result.amm;
        
        // Determine token names
        let token1Name, token2Name;
        
        if (amm.amount.currency === 'XRP') {
            token1Name = 'XRP';
        } else {
            token1Name = `${amm.amount.currency}.${amm.amount.issuer.substring(0, 8)}...`;
        }
        
        if (amm.amount2.currency === 'XRP') {
            token2Name = 'XRP';
        } else {
            token2Name = `${amm.amount2.currency}.${amm.amount2.issuer.substring(0, 8)}...`;
        }
        
        // Create input fields
        const fromTokenInput = new TextInputBuilder()
            .setCustomId('from_token')
            .setLabel(`From Token (${token1Name} or ${token2Name})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter token name (e.g., XRP)')
            .setRequired(true);
            
        const toTokenInput = new TextInputBuilder()
            .setCustomId('to_token')
            .setLabel(`To Token (${token1Name} or ${token2Name})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter token name (e.g., USD)')
            .setRequired(true);
            
        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Amount to Swap')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter amount (e.g., 100)')
            .setRequired(true);
            
        const slippageInput = new TextInputBuilder()
            .setCustomId('slippage')
            .setLabel('Maximum Slippage (%)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter maximum acceptable slippage (e.g., 1.0)')
            .setValue('1.0')
            .setRequired(true);
            
        // Add inputs to modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(fromTokenInput),
            new ActionRowBuilder().addComponents(toTokenInput),
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(slippageInput)
        );
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error preparing swap modal:', error);
        await interaction.reply({
            content: 'Error preparing swap interface. Please try again later.',
            ephemeral: true
        });
    } finally {
        await client.disconnect();
    }
}

// Process the swap form submission
export async function processAmmSwap(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Extract AMM account ID from the modal custom ID
        const ammAccountId = interaction.customId.replace('amm_swap_modal_', '');
        
        // Get form values
        const fromToken = interaction.fields.getTextInputValue('from_token');
        const toToken = interaction.fields.getTextInputValue('to_token');
        const amount = interaction.fields.getTextInputValue('amount');
        const slippage = interaction.fields.getTextInputValue('slippage');
        
        // Get user's wallet
        const wallet = await getConnectedWallet(interaction.user.id);
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Get AMM info
        const ammInfo = await client.request({
            command: "amm_info",
            amm_account: ammAccountId
        });
        
        const amm = ammInfo.result.amm;
        
        // Determine which asset is which
        let fromAsset, toAsset;
        
        if (fromToken.toUpperCase() === 'XRP') {
            fromAsset = { currency: 'XRP' };
        } else {
            // Parse the token string (e.g., "USD.r...")
            const [currency, issuer] = fromToken.split('.');
            fromAsset = {
                currency: currency,
                issuer: issuer || amm.amount.issuer || amm.amount2.issuer
            };
        }
        
        if (toToken.toUpperCase() === 'XRP') {
            toAsset = { currency: 'XRP' };
        } else {
            // Parse the token string
            const [currency, issuer] = toToken.split('.');
            toAsset = {
                currency: currency,
                issuer: issuer || amm.amount.issuer || amm.amount2.issuer
            };
        }
        
        // Calculate the expected output amount (simplified)
        // In a real implementation, you'd use the AMM formula: x * y = k
        let expectedOutput;
        let actualSlippage;
        
        if (fromAsset.currency === 'XRP' && toAsset.currency !== 'XRP') {
            // XRP to token
            const xrpPool = parseFloat(xrpl.dropsToXrp(amm.amount.value));
            const tokenPool = parseFloat(amm.amount2.value);
            const inputAmount = parseFloat(amount);
            
            // Calculate using constant product formula
            expectedOutput = (tokenPool * inputAmount) / (xrpPool + inputAmount);
            
            // Calculate slippage
            const perfectOutput = (tokenPool * inputAmount) / xrpPool;
            actualSlippage = ((perfectOutput - expectedOutput) / perfectOutput) * 100;
        } else if (fromAsset.currency !== 'XRP' && toAsset.currency === 'XRP') {
            // Token to XRP
            const tokenPool = parseFloat(amm.amount.value);
            const xrpPool = parseFloat(xrpl.dropsToXrp(amm.amount2.value));
            const inputAmount = parseFloat(amount);
            
            expectedOutput = (xrpPool * inputAmount) / (tokenPool + inputAmount);
            
            const perfectOutput = (xrpPool * inputAmount) / tokenPool;
            actualSlippage = ((perfectOutput - expectedOutput) / perfectOutput) * 100;
        } else {
            // Token to token (simplified)
            expectedOutput = parseFloat(amount) * 0.98; // Assume 2% slippage
            actualSlippage = 2.0;
        }
        
        // Check if slippage is acceptable
        if (actualSlippage > parseFloat(slippage)) {
            await interaction.editReply({
                content: `❌ Swap would exceed your maximum slippage tolerance. Expected slippage: ${actualSlippage.toFixed(2)}%`,
                ephemeral: true
            });
            await client.disconnect();
            return;
        }
        
        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#9933FF')
            .setTitle('🔄 Confirm Token Swap')
            .setDescription('Please review the details of your swap')
            .addFields(
                { name: 'From', value: `${amount} ${fromAsset.currency}`, inline: true },
                { name: 'To', value: `≈ ${expectedOutput.toFixed(6)} ${toAsset.currency}`, inline: true },
                { name: 'Slippage', value: `${actualSlippage.toFixed(2)}%`, inline: true },
                { name: 'AMM Pool', value: ammAccountId, inline: false },
                { name: '⚠️ Warning', value: 'Prices are estimates and may change due to market conditions.' }
            )
            .setTimestamp();
            
        // Add confirmation buttons
        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_swap_${ammAccountId}_${fromAsset.currency}_${toAsset.currency}_${amount}`)
                    .setLabel('Confirm Swap')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_swap')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
            
        await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmButtons],
            ephemeral: true
        });
        
        await client.disconnect();
    } catch (error) {
        console.error('Error processing swap:', error);
        await interaction.editReply({
            content: 'Error processing swap request. Please check your inputs and try again.',
            ephemeral: true
        });
    }
}

// Execute the actual swap transaction
export async function executeSwap(interaction, ammAccountId, fromCurrency, toCurrency, amount) {
    await interaction.deferUpdate();
    
    try {
        // Get user's wallet
        const wallet = await getConnectedWallet(interaction.user.id);
        if (!wallet) {
            await interaction.editReply({
                content: '❌ Wallet connection lost. Please reconnect your wallet and try again.',
                components: [],
                ephemeral: true
            });
            return;
        }
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Create and submit the swap transaction
        // Note: This is a simplified version. In a real implementation,
        // you would need to handle all the transaction details properly.
        
        const swapTx = {
            TransactionType: "AMMDeposit",
            Account: wallet.address,
            Asset: {
                currency: fromCurrency
            },
            Asset2: {
                currency: toCurrency
            },
            Amount: fromCurrency === 'XRP' ? xrpl.xrpToDrops(amount) : {
                currency: fromCurrency,
                value: amount
            },
            Flags: 0x00080000, // tfLimitLPToken flag for one-sided deposit (swap)
            Fee: "12"
        };
        
        // Prepare and sign transaction
        const prepared = await client.autofill(swapTx);
        const signed = wallet.sign(prepared);
        
        // Submit transaction
        const result = await client.submitAndWait(signed.tx_blob);
        
        if (result.result.meta.TransactionResult === "tesSUCCESS") {
            // Transaction successful
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Swap Successful')
                .setDescription(`You have successfully swapped ${amount} ${fromCurrency} to ${toCurrency}`)
                .addFields(
                    { name: 'Transaction Hash', value: result.result.hash, inline: false },
                    { name: 'View on Explorer', value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${result.result.hash})` }
                )
                .setTimestamp();
                
            await interaction.editReply({
                embeds: [successEmbed],
                components: [],
                ephemeral: true
            });
        } else {
            // Transaction failed
            await interaction.editReply({
                content: `❌ Swap failed: ${result.result.meta.TransactionResult}`,
                components: [],
                ephemeral: true
            });
        }
        
        await client.disconnect();
    } catch (error) {
        console.error('Error executing swap:', error);
        await interaction.editReply({
            content: `❌ Error executing swap: ${error.message}`,
            components: [],
            ephemeral: true
        });
    }
}
