import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import xrpl from 'xrpl';

// Mock data for collections - in a real implementation, you would fetch this from a database or API
const nftCollections = {
    "Xpunks": {
        issuer: "rNCFjv8Ek5oDrNiMJ3pw6eLLFtMjZLJnf2",
        totalSupply: 10000,
        floorPrice: 75,
        traits: ["Background", "Body", "Eyes", "Mouth", "Accessories", "Headwear"],
        traitRarity: {
            "Laser Eyes": 0.02,
            "Gold Background": 0.05,
            "Cyborg Arm": 0.08,
            // More traits would be here
        }
    },
    "XLS-20 Monsters": {
        issuer: "rLSn6Z3T8uCxbcd1oxwfGQN1Fdn5CyGujK",
        totalSupply: 5000,
        floorPrice: 120,
        traits: ["Type", "Element", "Rarity", "Power", "Special"],
        traitRarity: {
            "Legendary": 0.03,
            "Fire Element": 0.15,
            "Dragon Type": 0.07,
            // More traits would be here
        }
    }
};

// Mock NFT data - in a real implementation, you would fetch this from the XRPL
const mockNFTs = {
    "000100001234567890ABCDEF": {
        collection: "Xpunks",
        traits: {
            "Background": "Gold",
            "Eyes": "Laser",
            "Body": "Cyborg",
            "Mouth": "Smile",
            "Accessories": "Chain",
            "Headwear": "Cap"
        },
        rarityScore: 87.6,
        estimatedValue: {
            min: 250,
            max: 300
        },
        lastSale: 275,
        owner: "rNCFjv8Ek5oDrNiMJ3pw6eLLFtMjZLJnf2"
    },
    "000100009876543210FEDCBA": {
        collection: "XLS-20 Monsters",
        traits: {
            "Type": "Dragon",
            "Element": "Fire",
            "Rarity": "Legendary",
            "Power": "Inferno",
            "Special": "Flight"
        },
        rarityScore: 94.3,
        estimatedValue: {
            min: 400,
            max: 450
        },
        lastSale: 425,
        owner: "rLSn6Z3T8uCxbcd1oxwfGQN1Fdn5CyGujK"
    }
};

// Helper function to calculate trait rarity
function calculateTraitRarity(trait, value, collection) {
    // In a real implementation, this would analyze the collection data
    // For now, we'll use our mock data
    const traitKey = `${value} ${trait}`;
    return nftCollections[collection]?.traitRarity[traitKey] || 0.5; // Default to 50% if not found
}

// Show NFT lookup modal
export async function handleNFTLookup(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('nft_lookup_modal')
            .setTitle('NFT Lookup');

        const tokenIdInput = new TextInputBuilder()
            .setCustomId('token_id_input')
            .setLabel('Enter NFT TokenID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('000100001234567890ABCDEF')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(tokenIdInput);
        modal.addComponents(firstActionRow);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error in handleNFTLookup:', error);
        // Try to respond to the interaction if possible
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error processing your request. Please try again.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Error replying to interaction:', replyError);
        }
    }
}
// Process NFT lookup
export async function processNFTLookup(interaction) {
    const tokenId = interaction.fields.getTextInputValue('token_id_input');
    
    try {
        // In a real implementation, you would fetch this from the XRPL
        // For now, we'll use our mock data
        const nftData = mockNFTs[tokenId];
        
        if (!nftData) {
            await interaction.reply({
                content: `NFT with TokenID ${tokenId} not found. Please check the TokenID and try again.`,
                ephemeral: true
            });
            return;
        }
        
        const collection = nftCollections[nftData.collection];
        
        // Create the embed
        const nftEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`NFT: ${tokenId.substring(0, 8)}...`)
            .setDescription(`Collection: ${nftData.collection}`)
            .addFields(
                { name: '🏆 Rarity Score', value: `${nftData.rarityScore}/100 (Top ${Math.round(100 - nftData.rarityScore)}% of collection)`, inline: false },
                { name: '💰 Estimated Value', value: `${nftData.estimatedValue.min}-${nftData.estimatedValue.max} XRP`, inline: true },
                { name: '🏷️ Last Sale', value: `${nftData.lastSale} XRP`, inline: true },
                { name: '👤 Owner', value: `${nftData.owner.substring(0, 8)}...`, inline: true }
            );
            
        // Add traits
        let traitsField = '';
        for (const [trait, value] of Object.entries(nftData.traits)) {
            const rarity = calculateTraitRarity(trait, value, nftData.collection);
            const rarityPercent = (rarity * 100).toFixed(1);
            const rarityEmoji = rarity < 0.1 ? '🔥' : rarity < 0.3 ? '✨' : '';
            traitsField += `${trait}: ${value} (${rarityPercent}% rarity) ${rarityEmoji}\n`;
        }
        
        nftEmbed.addFields({ name: '📋 Traits', value: traitsField || 'No traits found', inline: false });
        
        // Add buttons for further actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`nft_value_${tokenId}`)
                    .setLabel('Detailed Valuation')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId(`nft_history_${tokenId}`)
                    .setLabel('Transaction History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setCustomId('nft_hub')
                    .setLabel('Back to NFT Hub')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );
            
        await interaction.reply({
            embeds: [nftEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in NFT lookup:', error);
        await interaction.reply({
            content: 'Error processing NFT lookup. Please try again later.',
            ephemeral: true
        });
    }
}

// Show NFT rarity and valuation modal
export async function handleNFTRarity(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('nft_rarity_modal')
        .setTitle('NFT Rarity & Valuation');

    const tokenIdInput = new TextInputBuilder()
        .setCustomId('token_id_input')
        .setLabel('Enter NFT TokenID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('000100001234567890ABCDEF')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(tokenIdInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

// Process NFT rarity and valuation
export async function processNFTRarity(interaction) {
    const tokenId = interaction.fields.getTextInputValue('token_id_input');
    
    try {
        // In a real implementation, you would fetch this from the XRPL
        // For now, we'll use our mock data
        const nftData = mockNFTs[tokenId];
        
        if (!nftData) {
            await interaction.reply({
                content: `NFT with TokenID ${tokenId} not found. Please check the TokenID and try again.`,
                ephemeral: true
            });
            return;
        }
        
        // Create the embed
        const rarityEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`📊 NFT Valuation Report`)
            .setDescription(`TokenID: ${tokenId}\nCollection: ${nftData.collection}`)
            .addFields(
                { name: '🏆 Rarity Score', value: `${nftData.rarityScore}/100 (Top ${Math.round(100 - nftData.rarityScore)}% of collection)`, inline: false }
            );
            
        // Add rare attributes
        let rareAttributes = '';
        for (const [trait, value] of Object.entries(nftData.traits)) {
            const rarity = calculateTraitRarity(trait, value, nftData.collection);
            if (rarity < 0.1) { // Less than 10% rarity
                const rarityPercent = (rarity * 100).toFixed(1);
                rareAttributes += `- ${value} ${trait} (appears in ${rarityPercent}% of collection) 🔥\n`;
            }
        }
        
        rarityEmbed.addFields({ 
            name: '📋 Rare Attributes', 
            value: rareAttributes || 'No particularly rare attributes found', 
            inline: false 
        });
        
        // Add valuation
        rarityEmbed.addFields(
            { name: '💰 Estimated Value', value: `${nftData.estimatedValue.min}-${nftData.estimatedValue.max} XRP`, inline: false },
            { name: '📈 Price Trend', value: 'Upward (+15% in last 30 days)', inline: false },
            { name: '🔍 Most Valuable Attribute', value: `${Object.values(nftData.traits)[0]} ${Object.keys(nftData.traits)[0]} (+120 XRP on average)`, inline: false }
        );
        
        // Add buttons for further actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`nft_lookup_${tokenId}`)
                    .setLabel('View NFT Details')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId(`nft_collection_${nftData.collection}`)
                    .setLabel('View Collection')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('nft_hub')
                    .setLabel('Back to NFT Hub')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );
            
        await interaction.reply({
            embeds: [rarityEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in NFT rarity analysis:', error);
        await interaction.reply({
            content: 'Error processing NFT rarity analysis. Please try again later.',
            ephemeral: true
        });
    }
}

// Show collection analysis modal
// Show collection analysis modal
export async function handleNFTCollection(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('nft_collection_modal')
        .setTitle('NFT Collection Analysis');

    const collectionInput = new TextInputBuilder()
        .setCustomId('collection_input')
        .setLabel('Enter Collection Name or Issuer Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Xpunks or rNCFjv8Ek5oDrNiMJ3pw6eLLFtMjZLJnf2')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(collectionInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

// Process collection analysis
export async function processNFTCollection(interaction) {
    const collectionInput = interaction.fields.getTextInputValue('collection_input');
    
    try {
        // Determine if input is a collection name or issuer address
        let collectionName;
        if (nftCollections[collectionInput]) {
            collectionName = collectionInput;
        } else {
            // Find collection by issuer address
            const collection = Object.entries(nftCollections).find(([_, data]) => data.issuer === collectionInput);
            if (collection) {
                collectionName = collection[0];
            } else {
                await interaction.reply({
                    content: `Collection "${collectionInput}" not found. Please check the name or issuer address and try again.`,
                    ephemeral: true
                });
                return;
            }
        }
        
        const collection = nftCollections[collectionName];
        
        // Create the embed
        const collectionEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`🖼️ Collection Analysis: ${collectionName}`)
            .addFields(
                { name: '📊 Collection Stats', value: 
                    `- Total Items: ${collection.totalSupply.toLocaleString()}\n` +
                    `- Owners: ${Math.round(collection.totalSupply * 0.3).toLocaleString()}\n` +
                    `- Floor Price: ${collection.floorPrice} XRP\n` +
                    `- Highest Sale: ${collection.floorPrice * 50} XRP (TokenID: 00010000ABCD...)`
                },
                { name: '🔝 Top Value Traits', value: 
                    `1. Laser Eyes (+120 XRP on average)\n` +
                    `2. Gold Background (+85 XRP on average)\n` +
                    `3. Cyborg Arm (+45 XRP on average)`
                },
                { name: '📈 Market Activity', value: 
                    `- 24h Volume: ${(collection.floorPrice * collection.totalSupply * 0.01).toLocaleString()} XRP\n` +
                    `- 7d Volume: ${(collection.floorPrice * collection.totalSupply * 0.07).toLocaleString()} XRP\n` +
                    `- Avg. Sale Price (7d): ${Math.round(collection.floorPrice * 1.25)} XRP`
                },
                { name: '🏆 Rarest NFTs in Collection', value: 
                    `1. TokenID: 00010000ABCD... (Rarity Score: 98.2)\n` +
                    `2. TokenID: 00010000EFGH... (Rarity Score: 97.5)\n` +
                    `3. TokenID: 00010000IJKL... (Rarity Score: 96.8)`
                }
            );
            
        // Add buttons for further actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`nft_floor_${collectionName}`)
                    .setLabel('View Floor NFTs')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId(`nft_rare_${collectionName}`)
                    .setLabel('View Rarest NFTs')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('nft_hub')
                    .setLabel('Back to NFT Hub')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );
            
        await interaction.reply({
            embeds: [collectionEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in collection analysis:', error);
        await interaction.reply({
            content: 'Error processing collection analysis. Please try again later.',
            ephemeral: true
        });
    }
}

// Show portfolio valuation modal
export async function handleNFTPortfolio(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('nft_portfolio_modal')
        .setTitle('NFT Portfolio Valuation');

    const addressInput = new TextInputBuilder()
        .setCustomId('address_input')
        .setLabel('Enter XRPL Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('rNCFjv8Ek5oDrNiMJ3pw6eLLFtMjZLJnf2')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(addressInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

// Process portfolio valuation
export async function processNFTPortfolio(interaction) {
    const address = interaction.fields.getTextInputValue('address_input');
    
    try {
        // In a real implementation, you would fetch NFTs owned by this address from the XRPL
        // For now, we'll use mock data
        
        // Find NFTs owned by this address
        const ownedNFTs = Object.entries(mockNFTs).filter(([_, data]) => data.owner === address);
        
        if (ownedNFTs.length === 0) {
            await interaction.reply({
                content: `No NFTs found for address ${address}. Please check the address and try again.`,
                ephemeral: true
            });
            return;
        }
        
        // Calculate portfolio value
        let totalMinValue = 0;
        let totalMaxValue = 0;
        const collectionCounts = {};
        const collectionValues = {};
        
        ownedNFTs.forEach(([_, nft]) => {
            totalMinValue += nft.estimatedValue.min;
            totalMaxValue += nft.estimatedValue.max;
            
            if (!collectionCounts[nft.collection]) {
                collectionCounts[nft.collection] = 0;
                collectionValues[nft.collection] = { min: 0, max: 0 };
            }
            
            collectionCounts[nft.collection]++;
            collectionValues[nft.collection].min += nft.estimatedValue.min;
            collectionValues[nft.collection].max += nft.estimatedValue.max;
        });
        
        // Find most valuable NFT
        const mostValuableNFT = ownedNFTs.reduce((prev, curr) => {
            return (prev[1].estimatedValue.max > curr[1].estimatedValue.max) ? prev : curr;
        });
        
        // Create the embed
        const portfolioEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('💼 NFT Portfolio Valuation')
            .setDescription(`Address: ${address}\nTotal NFTs: ${ownedNFTs.length}\nEstimated Portfolio Value: ${totalMinValue}-${totalMaxValue} XRP`);
            
        // Add collection breakdown
        let collectionBreakdown = '';
        for (const [collection, count] of Object.entries(collectionCounts)) {
            const values = collectionValues[collection];
            collectionBreakdown += `- ${collection}: ${count} NFTs (Est. Value: ${values.min}-${values.max} XRP)\n`;
        }
        
        portfolioEmbed.addFields({ 
            name: '📊 Collection Breakdown', 
            value: collectionBreakdown, 
            inline: false 
        });
        
        // Add most valuable NFT
        portfolioEmbed.addFields({ 
            name: '🏆 Most Valuable NFT', 
            value: 
                `TokenID: ${mostValuableNFT[0].substring(0, 12)}...\n` +
                `Collection: ${mostValuableNFT[1].collection}\n` +
                `Rarity: ${mostValuableNFT[1].rarityScore}/100\n` +
                `Est. Value: ${mostValuableNFT[1].estimatedValue.min}-${mostValuableNFT[1].estimatedValue.max} XRP`,
            inline: false 
        });
        
        // Add recommendation
        portfolioEmbed.addFields({ 
            name: '💡 Recommendation', 
            value: `The ${Object.keys(collectionCounts)[0]} collection has seen a 25% increase in floor price over the last week. Consider monitoring for selling opportunities.`,
            inline: false 
        });
        
        // Add buttons for further actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`nft_detail_${mostValuableNFT[0]}`)
                    .setLabel('View Most Valuable NFT')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId(`nft_collection_${Object.keys(collectionCounts)[0]}`)
                    .setLabel('View Top Collection')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('nft_hub')
                    .setLabel('Back to NFT Hub')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );
            
        await interaction.reply({
            embeds: [portfolioEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in portfolio valuation:', error);
        await interaction.reply({
            content: 'Error processing portfolio valuation. Please try again later.',
            ephemeral: true
        });
    }
}

// Show NFT comparison modal
export async function handleNFTCompare(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('nft_compare_modal')
        .setTitle('Compare NFTs');

    const tokenId1Input = new TextInputBuilder()
        .setCustomId('token_id1_input')
        .setLabel('Enter First NFT TokenID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('000100001234567890ABCDEF')
        .setRequired(true);
        
    const tokenId2Input = new TextInputBuilder()
        .setCustomId('token_id2_input')
        .setLabel('Enter Second NFT TokenID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('000100009876543210FEDCBA')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(tokenId1Input);
    const secondActionRow = new ActionRowBuilder().addComponents(tokenId2Input);
    modal.addComponents(firstActionRow, secondActionRow);
    await interaction.showModal(modal);
}

// Process NFT comparison
export async function processNFTCompare(interaction) {
    const tokenId1 = interaction.fields.getTextInputValue('token_id1_input');
    const tokenId2 = interaction.fields.getTextInputValue('token_id2_input');
    
    try {
        // In a real implementation, you would fetch this from the XRPL
        // For now, we'll use our mock data
        const nft1 = mockNFTs[tokenId1];
        const nft2 = mockNFTs[tokenId2];
        
        if (!nft1 || !nft2) {
            await interaction.reply({
                content: `One or both NFTs not found. Please check the TokenIDs and try again.`,
                ephemeral: true
            });
            return;
        }
        
        // Check if they're from the same collection
        if (nft1.collection !== nft2.collection) {
            await interaction.reply({
                content: `These NFTs are from different collections (${nft1.collection} vs ${nft2.collection}). Comparison works best for NFTs from the same collection.`,
                ephemeral: true
            });
            // We'll continue anyway, but with this warning
        }
        
        // Find common and unique traits
        const commonTraits = [];
        const uniqueTraits1 = [];
        const uniqueTraits2 = [];
        
        for (const [trait, value] of Object.entries(nft1.traits)) {
            if (nft2.traits[trait] === value) {
                commonTraits.push(`${trait}: ${value}`);
            } else {
                uniqueTraits1.push(`${trait}: ${value}`);
            }
        }
        
        for (const [trait, value] of Object.entries(nft2.traits)) {
            if (nft1.traits[trait] !== value && nft1.traits[trait] !== undefined) {
                uniqueTraits2.push(`${trait}: ${value}`);
            }
        }
        
        // Create the embed
        const compareEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🔍 NFT Comparison')
            .setDescription(`Collection: ${nft1.collection}`)
            .addFields(
                { name: `NFT #1 (TokenID: ${tokenId1.substring(0, 8)}...)`, value: 
                    `- Rarity Score: ${nft1.rarityScore}/100\n` +
                    `- Est. Value: ${nft1.estimatedValue.min}-${nft1.estimatedValue.max} XRP\n` +
                    `- Unique Traits: ${uniqueTraits1.join(', ') || 'None'}`
                },
                { name: `NFT #2 (TokenID: ${tokenId2.substring(0, 8)}...)`, value: 
                    `- Rarity Score: ${nft2.rarityScore}/100\n` +
                    `- Est. Value: ${nft2.estimatedValue.min}-${nft2.estimatedValue.max} XRP\n` +
                    `- Unique Traits: ${uniqueTraits2.join(', ') || 'None'}`
                },
                { name: '📊 Comparison', value: 
                    `- NFT #${nft1.rarityScore > nft2.rarityScore ? '1' : '2'} is rarer by ${Math.abs(nft1.rarityScore - nft2.rarityScore).toFixed(1)} points\n` +
                                    `- NFT #${nft1.rarityScore > nft2.rarityScore ? '1' : '2'} is rarer by ${Math.abs(nft1.rarityScore - nft2.rarityScore).toFixed(1)} points\n` +
                                    `- NFT #${nft1.estimatedValue.min > nft2.estimatedValue.min ? '1' : '2'} has an estimated value ~${Math.abs(nft1.estimatedValue.min - nft2.estimatedValue.min)} XRP higher\n` +
                                    `- Both share ${commonTraits.length} common traits: ${commonTraits.join(', ') || 'None'}\n` +
                                    `- NFT #1 has the ${uniqueTraits1.length > 0 ? `"${uniqueTraits1[0]}"` : 'no unique'} trait\n` +
                                    `- NFT #2 has the ${uniqueTraits2.length > 0 ? `"${uniqueTraits2[0]}"` : 'no unique'} trait`
                                }
                            )
            
                        // Add buttons for further actions
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`nft_lookup_${tokenId1}`)
                                    .setLabel('View NFT #1')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('🔍'),
                                new ButtonBuilder()
                                    .setCustomId(`nft_lookup_${tokenId2}`)
                                    .setLabel('View NFT #2')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('🔍'),
                                new ButtonBuilder()
                                    .setCustomId('nft_hub')
                                    .setLabel('Back to NFT Hub')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('🔙')
                            )
            
                        await interaction.reply({
                            embeds: [compareEmbed],
                            components: [row],
                            ephemeral: true
                        })
        
                    } catch (error) {
                        console.error('Error in NFT comparison:', error)
                        await interaction.reply({
                            content: 'Error processing NFT comparison. Please try again later.',
                            ephemeral: true
                        })
                    }
}

// Show market trends
export async function handleNFTMarket(interaction) {
                    try {
                        // In a real implementation, you would fetch market data from the XRPL or an API
                        // For now, we'll use mock data
        
                        const marketEmbed = new EmbedBuilder()
                            .setColor('#FF6B6B')
                            .setTitle('📈 XRPL NFT Market Trends')
                            .setDescription('Latest market activity and trends for popular NFT collections')
                            .addFields(
                                { name: '🔥 Top Collections by Volume (24h)', value: 
                                    `1. Xpunks: 25,000 XRP\n` +
                                    `2. XLS-20 Monsters: 18,500 XRP\n` +
                                    `3. XRPL Landscapes: 12,300 XRP\n` +
                                    `4. Pixel Heroes: 8,750 XRP\n` +
                                    `5. Crypto Legends: 6,200 XRP`
                                },
                                { name: '📊 Market Overview', value: 
                                    `- Total Volume (24h): 95,000 XRP\n` +
                                    `- Unique Buyers: 320\n` +
                                    `- Unique Sellers: 280\n` +
                                    `- New Collections: 3\n` +
                                    `- Avg. Sale Price: 185 XRP`
                                },
                                { name: '📈 Price Trends', value: 
                                    `- Xpunks: +15% (7d)\n` +
                                    `- XLS-20 Monsters: +8% (7d)\n` +
                                    `- XRPL Landscapes: -3% (7d)\n` +
                                    `- Overall Market: +7% (7d)`
                                },
                                { name: '🌟 Notable Sales', value: 
                                    `- Xpunks #1234: 5,000 XRP\n` +
                                    `- XLS-20 Monsters #789: 4,200 XRP\n` +
                                    `- Crypto Legends #42: 3,800 XRP`
                                }
                            )
            
                        // Add buttons for further actions
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('nft_collection_Xpunks')
                                    .setLabel('View Top Collection')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('📊'),
                                new ButtonBuilder()
                                    .setCustomId('nft_sales')
                                    .setLabel('Recent Sales')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('💰'),
                                new ButtonBuilder()
                                    .setCustomId('nft_hub')
                                    .setLabel('Back to NFT Hub')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('🔙')
                            )
            
                        await interaction.reply({
                            embeds: [marketEmbed],
                            components: [row],
                            ephemeral: true
                        })
        
                    } catch (error) {
                        console.error('Error in market trends:', error)
                        await interaction.reply({
                            content: 'Error processing market trends. Please try again later.',
                            ephemeral: true
                        })
                    }
}

// Return to NFT Hub
export async function handleNFTHub(interaction) {
                    const nftEmbed = new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('🎨 XRPL NFT Hub')
                        .setDescription('Analyze, value, and explore NFTs on the XRP Ledger')
                        .addFields(
                            { name: '🔍 NFT Lookup', value: 'View details about specific NFTs by TokenID' },
                            { name: '💰 Rarity & Valuation', value: 'Calculate rarity scores and estimated values' },
                            { name: '📊 Collection Analysis', value: 'Analyze entire NFT collections for trends and statistics' },
                            { name: '💼 Portfolio Valuation', value: 'Value all NFTs in an XRPL wallet' },
                            { name: '🏆 Rarity Comparison', value: 'Compare rarity and value between multiple NFTs' },
                            { name: '📈 Market Trends', value: 'View market trends for popular NFT collections' }
                        )

                    const row1 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('nft_lookup')
                                .setLabel('NFT Lookup')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🔍'),
                            new ButtonBuilder()
                                .setCustomId('nft_rarity')
                                .setLabel('Rarity & Value')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('💰'),
                            new ButtonBuilder()
                                .setCustomId('nft_collection')
                                .setLabel('Collection Analysis')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('📊')
                        )
        
                    const row2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('nft_portfolio')
                                .setLabel('Portfolio Valuation')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('💼'),
                            new ButtonBuilder()
                                .setCustomId('nft_compare')
                                .setLabel('Compare NFTs')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🏆'),
                            new ButtonBuilder()
                                .setCustomId('nft_market')
                                .setLabel('Market Trends')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('📈')
                        )

                    await interaction.reply({ 
                        embeds: [nftEmbed], 
                        components: [row1, row2],
                        ephemeral: true
                    })
}

// Add these functions to handle dynamic button IDs

export async function handleSpecificNFTLookup(interaction, tokenId) {
    try {
        // In a real implementation, you would fetch this from the XRPL
        // For now, we'll use our mock data
        const nftData = mockNFTs[tokenId]
        
        if (!nftData) {
            await interaction.reply({
                content: `NFT with TokenID ${tokenId} not found. Please check the TokenID and try again.`,
                ephemeral: true
            })
            return
        }
        
        // Create the embed (similar to processNFTLookup)
        const nftEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`NFT: ${tokenId.substring(0, 8)}...`)
            .setDescription(`Collection: ${nftData.collection}`)
            .addFields(
                { name: '🏆 Rarity Score', value: `${nftData.rarityScore}/100 (Top ${Math.round(100 - nftData.rarityScore)}% of collection)`, inline: false },
                { name: '💰 Estimated Value', value: `${nftData.estimatedValue.min}-${nftData.estimatedValue.max} XRP`, inline: true },
                { name: '🏷️ Last Sale', value: `${nftData.lastSale} XRP`, inline: true },
                { name: '👤 Owner', value: `${nftData.owner.substring(0, 8)}...`, inline: true }
            )
            
        // Add traits
        let traitsField = ''
        for (const [trait, value] of Object.entries(nftData.traits)) {
            const rarity = calculateTraitRarity(trait, value, nftData.collection)
            const rarityPercent = (rarity * 100).toFixed(1)
            const rarityEmoji = rarity < 0.1 ? '🔥' : rarity < 0.3 ? '✨' : ''
            traitsField += `${trait}: ${value} (${rarityPercent}% rarity) ${rarityEmoji}\n`
        }
        
        nftEmbed.addFields({ name: '📋 Traits', value: traitsField || 'No traits found', inline: false })
        
        // Add buttons for further actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`nft_value_${tokenId}`)
                    .setLabel('Detailed Valuation')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId(`nft_history_${tokenId}`)
                    .setLabel('Transaction History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setCustomId('nft_hub')
                    .setLabel('Back to NFT Hub')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            )
            
        await interaction.reply({
            embeds: [nftEmbed],
            components: [row],
            ephemeral: true
        })
        
    } catch (error) {
        console.error('Error in handleSpecificNFTLookup:', error)
        await interaction.reply({
            content: 'Error processing NFT lookup. Please try again later.',
            ephemeral: true
        })
    }
}

// Implement similar handlers for other dynamic buttons
export async function handleSpecificNFTValuation(interaction, tokenId) {
    // Similar implementation to processNFTRarity but for a specific token
    // ...
}

export async function handleSpecificNFTHistory(interaction, tokenId) {
    // Implementation for showing transaction history
    // ...
}

export async function handleSpecificCollection(interaction, collectionName) {
    // Implementation for showing a specific collection
    // ...
}