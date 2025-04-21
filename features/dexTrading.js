import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import xrpl from 'xrpl';
// Import the correct functions
import { getConnectedWallets } from './walletManager.js';

// Common trading pairs
const COMMON_PAIRS = [
    { 
        name: 'XRP/USD', 
        base: { currency: 'XRP' }, 
        quote: { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' }
    },
    { 
        name: 'XRP/EUR', 
        base: { currency: 'XRP' }, 
        quote: { currency: 'EUR', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' }
    },
    { 
        name: 'XRP/BTC', 
        base: { currency: 'XRP' }, 
        quote: { currency: 'BTC', issuer: 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL' }
    }
];

// Handle Order Book button
export async function handleOrderBook(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Create pair selector
        const pairSelector = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('order_book_pair_select')
                    .setPlaceholder('Select a trading pair')
                    .addOptions(
                        COMMON_PAIRS.map(pair => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(pair.name)
                                .setValue(pair.name)
                                .setDescription(`View ${pair.name} order book`)
                        )
                    )
            );
            
        await interaction.editReply({
            content: 'Select a trading pair to view the order book:',
            components: [pairSelector]
        });
    } catch (error) {
        console.error('Order book error:', error);
        await interaction.editReply({
            content: 'Error loading order book. Please try again later.',
            components: []
        });
    }
}

// Handle Order Book pair selection
export async function handleOrderBookPairSelect(interaction) {
    await interaction.deferUpdate();
    
    try {
        const selectedPair = interaction.values[0];
        const pair = COMMON_PAIRS.find(p => p.name === selectedPair);
        
        if (!pair) {
            await interaction.editReply({
                content: 'Invalid pair selection. Please try again.',
                components: []
            });
            return;
        }
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Get buy orders (offers where taker_gets is the base currency)
        const buyOrdersRequest = {
            command: "book_offers",
            taker_gets: pair.base,
            taker_pays: pair.quote,
            limit: 10
        };
        
        // Get sell orders (offers where taker_pays is the base currency)
        const sellOrdersRequest = {
            command: "book_offers",
            taker_gets: pair.quote,
            taker_pays: pair.base,
            limit: 10
        };
        
        const [buyOrdersResponse, sellOrdersResponse] = await Promise.all([
            client.request(buyOrdersRequest),
            client.request(sellOrdersRequest)
        ]);
        
        const buyOrders = buyOrdersResponse.result.offers || [];
        const sellOrders = sellOrdersResponse.result.offers || [];
        
        // Format orders for display
        const formatOrders = (orders, isBuy) => {
            return orders.map(order => {
                let price, amount;
                
                if (isBuy) {
                    // For buy orders
                    if (pair.base.currency === 'XRP') {
                        amount = xrpl.dropsToXrp(order.TakerGets);
                        price = parseFloat(order.TakerPays.value) / parseFloat(amount);
                    } else {
                        amount = order.TakerGets.value;
                        price = parseFloat(order.TakerPays) / parseFloat(amount);
                    }
                } else {
                    // For sell orders
                    if (pair.base.currency === 'XRP') {
                        amount = xrpl.dropsToXrp(order.TakerPays);
                        price = parseFloat(order.TakerGets.value) / parseFloat(amount);
                    } else {
                        amount = order.TakerPays.value;
                        price = parseFloat(order.TakerGets) / parseFloat(amount);
                    }
                }
                
                return {
                    price: price.toFixed(6),
                    amount: parseFloat(amount).toFixed(4),
                    total: (price * parseFloat(amount)).toFixed(4)
                };
            });
        };
        
        const formattedBuyOrders = formatOrders(buyOrders, true);
        const formattedSellOrders = formatOrders(sellOrders, false);
        
        // Create order book embed
        const orderBookEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 ${pair.name} Order Book`)
            .setDescription('Current market orders on the XRPL DEX')
            .setTimestamp();
            
        // Add sell orders (in reverse order, highest price first)
        let sellOrdersText = '';
        formattedSellOrders.reverse().forEach(order => {
            sellOrdersText += `Price: ${order.price} | Amount: ${order.amount} | Total: ${order.total}\n`;
        });
        
        if (sellOrdersText) {
            orderBookEmbed.addFields({
                name: '📉 Sell Orders',
                value: '' + sellOrdersText + ''
            });
        } else {
            orderBookEmbed.addFields({
                name: '📉 Sell Orders',
                value: 'No sell orders found'
            });
        }
        
        // Add buy orders
        let buyOrdersText = '';
        formattedBuyOrders.forEach(order => {
            buyOrdersText += `Price: ${order.price} | Amount: ${order.amount} | Total: ${order.total}\n`;
        });
        
        if (buyOrdersText) {
            orderBookEmbed.addFields({
                name: '📈 Buy Orders',
                value: '' + buyOrdersText + ''
            });
        } else {
            orderBookEmbed.addFields({
                name: '📈 Buy Orders',
                value: 'No buy orders found'
            });
        }
        
        // Add spread information
        if (formattedSellOrders.length > 0 && formattedBuyOrders.length > 0) {
            const lowestSell = parseFloat(formattedSellOrders[0].price);
            const highestBuy = parseFloat(formattedBuyOrders[0].price);
            const spread = lowestSell - highestBuy;
            const spreadPercent = (spread / lowestSell) * 100;
            
            orderBookEmbed.addFields({
                name: '↔️ Spread',
                value: `${spread.toFixed(6)} (${spreadPercent.toFixed(2)}%)`
            });
        }
        
        // Add refresh button
        const refreshButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`refresh_order_book_${pair.name}`)
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('quick_trade')
                    .setLabel('Quick Trade')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💱')
            );
            
        await interaction.editReply({
            embeds: [orderBookEmbed],
            components: [refreshButton]
        });
        
        await client.disconnect();
    } catch (error) {
        console.error('Order book error:', error);
        await interaction.editReply({
            content: 'Error loading order book. Please try again later.',
            components: []
        });
    }
}

// Handle Quick Trade button
export async function handleQuickTrade(interaction) {
    try {
        // Check if user has a connected wallet
        const userId = interaction.user.id;
        let wallets = await getConnectedWallets(userId);
        
        // Ensure wallets is an array
        if (!wallets || !Array.isArray(wallets)) {
            wallets = [];
        }
        
        if (wallets.length === 0) {
            const noWalletEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Connected Wallet')
                .setDescription('You need to connect a wallet before you can trade.')
                .addFields(
                    { name: 'How to Connect', value: 'Use the `/wallet` command and select "Connect Wallet".' }
                );
                
            await interaction.reply({
                embeds: [noWalletEmbed],
                ephemeral: true
            });
            return;
        }
        
        // Use the first wallet
        const wallet = wallets[0];
        
        // Create pair selector
        const pairSelector = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('quick_trade_pair_select')
                    .setPlaceholder('Select a trading pair')
                    .addOptions(
                        COMMON_PAIRS.map(pair => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(pair.name)
                                .setValue(pair.name)
                                .setDescription(`Quick trade ${pair.name}`)
                        )
                    )
            );
            
        const tradeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('💱 Quick Trade')
            .setDescription('Select a trading pair to trade on the XRPL DEX');
            
        await interaction.reply({
            embeds: [tradeEmbed],
            components: [pairSelector],
            ephemeral: true
        });
    } catch (error) {
        console.error('Quick trade error:', error);
        await interaction.reply({
            content: 'Error initializing trade interface. Please try again later.',
            ephemeral: true
        });
    }
}

// Handle Quick Trade Buy/Sell selection
export async function handleQuickTradeType(interaction, tradeType) {
    try {
        // Create pair selector
        const pairSelector = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`quick_trade_pair_${tradeType}`)
                    .setPlaceholder('Select a trading pair')
                    .addOptions(
                        COMMON_PAIRS.map(pair => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(pair.name)
                                .setValue(pair.name)
                                .setDescription(`${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} ${pair.name}`)
                        )
                    )
            );
            
        const tradeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`💱 Quick ${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)}`)
            .setDescription(`Select a trading pair to ${tradeType} on the XRPL DEX`);
            
        await interaction.update({
            embeds: [tradeEmbed],
            components: [pairSelector]
        });
    } catch (error) {
        console.error('Quick trade error:', error);
        await interaction.update({
            content: 'Error selecting trade type. Please try again later.',
            components: []
        });
    }
}

// Handle Quick Trade Pair selection
export async function handleQuickTradePair(interaction, tradeType) {
    try {
        const selectedPair = interaction.values[0];
        const pair = COMMON_PAIRS.find(p => p.name === selectedPair);
        
        if (!pair) {
            await interaction.update({
                content: 'Invalid pair selection. Please try again.',
                components: []
            });
            return;
        }
        
        // Create trade modal
        const tradeModal = new ModalBuilder()
            .setCustomId(`quick_trade_modal_${tradeType}_${selectedPair}`)
            .setTitle(`${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} ${selectedPair}`);
            
        // Add amount input
        const amountInput = new TextInputBuilder()
            .setCustomId('trade_amount')
            .setLabel(`Amount to ${tradeType} (in ${pair.base.currency})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter amount (e.g., 100)')
            .setRequired(true);
            
        // Add price input
        const priceInput = new TextInputBuilder()
            .setCustomId('trade_price')
            .setLabel(`Price per ${pair.base.currency} (in ${pair.quote.currency})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter price (e.g., 0.5)')
            .setRequired(true);
            
        // Add expiration input
        const expirationInput = new TextInputBuilder()
            .setCustomId('trade_expiration')
            .setLabel('Expiration (in hours, 0 for no expiration)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter expiration (e.g., 24)')
            .setValue('24')
            .setRequired(true);
            
        // Add inputs to modal
        tradeModal.addComponents(
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(expirationInput)
        );
        
        await interaction.showModal(tradeModal);
    } catch (error) {
        console.error('Quick trade error:', error);
        await interaction.update({
            content: 'Error selecting trading pair. Please try again later.',
            components: []
        });
    }
}

// Process Quick Trade form submission
export async function processQuickTrade(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Parse the custom ID to get trade type and pair
        const customId = interaction.customId;
        const [_, __, tradeType, pairName] = customId.split('_');
        
        const pair = COMMON_PAIRS.find(p => p.name === pairName);
        if (!pair) {
            await interaction.editReply('Invalid trading pair. Please try again.');
            return;
        }
        
        // Get form values
        const amount = interaction.fields.getTextInputValue('trade_amount');
        const price = interaction.fields.getTextInputValue('trade_price');
        const expiration = interaction.fields.getTextInputValue('trade_expiration');
        
        // Validate inputs
        if (isNaN(amount) || parseFloat(amount) <= 0) {
            await interaction.editReply('Invalid amount. Please enter a positive number.');
            return;
        }
        
        if (isNaN(price) || parseFloat(price) <= 0) {
            await interaction.editReply('Invalid price. Please enter a positive number.');
            return;
        }
        
        if (isNaN(expiration) || parseInt(expiration) < 0) {
            await interaction.editReply('Invalid expiration. Please enter a non-negative number.');
            return;
        }
        
        // Get user's wallet
        const wallet = await getConnectedWallet(interaction.user.id);
        if (!wallet) {
            await interaction.editReply('Wallet connection lost. Please reconnect your wallet and try again.');
            return;
        }
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Create the offer transaction
        const offerCreate = {
            TransactionType: "OfferCreate",
            Account: wallet.address,
            Fee: "12",
        };
        
        // Set expiration if provided
        if (parseInt(expiration) > 0) {
            const expirationSeconds = parseInt(expiration) * 3600; // Convert hours to seconds
            offerCreate.Expiration = Math.floor(Date.now() / 1000) + expirationSeconds;
        }
        
        // Calculate TakerGets and TakerPays based on trade type
        const amountValue = parseFloat(amount);
        const priceValue = parseFloat(price);
        const totalValue = amountValue * priceValue;
        
        if (tradeType === 'buy') {
            // When buying, you pay the quote currency and get the base currency
            if (pair.base.currency === 'XRP') {
                offerCreate.TakerGets = xrpl.xrpToDrops(amountValue.toString());
            } else {
                offerCreate.TakerGets = {
                    currency: pair.base.currency,
                    issuer: pair.base.issuer,
                    value: amountValue.toString()
                };
            }
            
            if (pair.quote.currency === 'XRP') {
                offerCreate.TakerPays = xrpl.xrpToDrops(totalValue.toString());
            } else {
                offerCreate.TakerPays = {
                    currency: pair.quote.currency,
                    issuer: pair.quote.issuer,
                    value: totalValue.toString()
                };
            }
        } else { // sell
            // When selling, you pay the base currency and get the quote currency
            if (pair.base.currency === 'XRP') {
                offerCreate.TakerPays = xrpl.xrpToDrops(amountValue.toString());
            } else {
                offerCreate.TakerPays = {
                    currency: pair.base.currency,
                    issuer: pair.base.issuer,
                    value: amountValue.toString()
                };
            }
            
            if (pair.quote.currency === 'XRP') {
                offerCreate.TakerGets = xrpl.xrpToDrops(totalValue.toString());
            } else {
                offerCreate.TakerGets = {
                    currency: pair.quote.currency,
                    issuer: pair.quote.issuer,
                    value: totalValue.toString()
                };
            }
        }
        
        // Prepare transaction
        const prepared = await client.autofill(offerCreate);
        
        // Sign transaction
        const signed = wallet.sign(prepared);
        
        // Submit transaction
        const result = await client.submitAndWait(signed.tx_blob);
        
        if (result.result.meta.TransactionResult === "tesSUCCESS") {
            // Transaction successful
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Order Placed Successfully')
                .setDescription(`Your ${tradeType} order has been placed on the XRPL DEX`)
                .addFields(
                    { name: 'Pair', value: pairName, inline: true },
                    { name: 'Type', value: tradeType.toUpperCase(), inline: true },
                    { name: 'Amount', value: `${amount} ${pair.base.currency}`, inline: true },
                    { name: 'Price', value: `${price} ${pair.quote.currency}`, inline: true },
                    { name: 'Total', value: `${totalValue.toFixed(6)} ${pair.quote.currency}`, inline: true },
                    { name: 'Transaction Hash', value: result.result.hash },
                    { name: 'View on Explorer', value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${result.result.hash})` }
                )
                .setTimestamp();
                
            await interaction.editReply({
                embeds: [successEmbed]
            });
        } else {
            // Transaction failed
            await interaction.editReply(`❌ Order placement failed: ${result.result.meta.TransactionResult}`);
        }
        
        await client.disconnect();
    } catch (error) {
        console.error('Quick trade error:', error);
        await interaction.editReply('Error processing trade. Please check your inputs and try again.');
    }
}

// Handle My Orders button
export async function handleMyOrders(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Instead of trying to get a connected wallet, show a message asking the user to connect one
        const noWalletEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('📝 My Orders')
            .setDescription('To view your orders, you need to connect a wallet first.')
            .addFields(
                { name: 'Connect Wallet', value: 'Use the `/wallet` command and select "Connect Wallet" to link your XRPL wallet.' }
            );
            
        const connectButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('connect_wallet')
                    .setLabel('Connect Wallet')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔗')
            );
            
        await interaction.editReply({
            embeds: [noWalletEmbed],
            components: [connectButton]
        });
    } catch (error) {
        console.error('My orders error:', error);
        await interaction.editReply('Error fetching your orders. Please try again later.');
    }
}

// Handle Cancel Order button
export async function handleCancelOrder(interaction) {
    try {
        // Instead of trying to get a connected wallet, show a message asking the user to connect one
        await interaction.reply({
            content: 'To cancel orders, you need to connect a wallet first. Use the `/wallet` command and select "Connect Wallet".',
            ephemeral: true
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        await interaction.reply({
            content: 'Error initializing cancel order. Please try again later.',
            ephemeral: true
        });
    }
}

// Process Cancel Order form submission
export async function processCancelOrder(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Get form values
        const sequence = interaction.fields.getTextInputValue('order_sequence');
        
        // Validate input
        if (isNaN(sequence) || parseInt(sequence) <= 0) {
            await interaction.editReply('Invalid sequence number. Please enter a positive integer.');
            return;
        }
        
        // Get user's wallet
        const wallet = await getConnectedWallet(interaction.user.id);
        if (!wallet) {
            await interaction.editReply('Wallet connection lost. Please reconnect your wallet and try again.');
            return;
        }
        
        // Connect to XRPL
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Create the offer cancel transaction
        const offerCancel = {
            TransactionType: "OfferCancel",
            Account: wallet.address,
            OfferSequence: parseInt(sequence),
            Fee: "12"
        };
        
        // Prepare transaction
        const prepared = await client.autofill(offerCancel);
        
        // Sign transaction
        const signed = wallet.sign(prepared);
        
        // Submit transaction
        const result = await client.submitAndWait(signed.tx_blob);
        
        if (result.result.meta.TransactionResult === "tesSUCCESS") {
            // Transaction successful
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Order Cancelled Successfully')
                .setDescription(`Your order with sequence ${sequence} has been cancelled`)
                .addFields(
                    { name: 'Transaction Hash', value: result.result.hash },
                    { name: 'View on Explorer', value: `[View on XRPL Explorer](https://livenet.xrpl.org/transactions/${result.result.hash})` }
                )
                .setTimestamp();
                
            await interaction.editReply({
                embeds: [successEmbed]
            });
        } else {
            // Transaction failed
            await interaction.editReply(`❌ Order cancellation failed: ${result.result.meta.TransactionResult}`);
        }
        
        await client.disconnect();
    } catch (error) {
        console.error('Cancel order error:', error);
        await interaction.editReply('Error cancelling order. Please try again later.');
    }
}
