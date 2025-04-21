import { SlashCommandBuilder } from '@discordjs/builders';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import xrpl from 'xrpl';

export default {
    data: new SlashCommandBuilder()
        .setName('amm-dashboard')
        .setDescription('View a dashboard of all active AMM pools on the XRPL'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // Connect to XRPL
            const client = new xrpl.Client("wss://s1.ripple.com");
            await client.connect();
            
            // Common AMM pools to check
            const commonPools = [
                {
                    asset1: { currency: 'XRP' },
                    asset2: { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' }
                },
                {
                    asset1: { currency: 'XRP' },
                    asset2: { currency: 'EUR', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' }
                },
                {
                    asset1: { currency: 'XRP' },
                    asset2: { currency: 'BTC', issuer: 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL' }
                }
            ];
            
            // Fetch data for each pool
            const poolData = [];
            
            for (const pool of commonPools) {
                try {
                    // Use book_offers to get liquidity data
                    const orderBookRequest = {
                        command: "book_offers",
                        taker_pays: pool.asset1.currency === 'XRP' ? 
                            { currency: 'XRP' } : 
                            { 
                                currency: pool.asset1.currency, 
                                issuer: pool.asset1.issuer 
                            },
                        taker_gets: pool.asset2.currency === 'XRP' ? 
                            { currency: 'XRP' } : 
                            { 
                                currency: pool.asset2.currency, 
                                issuer: pool.asset2.issuer 
                            },
                        limit: 10
                    };
                    
                    const response = await client.request(orderBookRequest);
                    const offers = response.result.offers || [];
                    
                    // Calculate total liquidity
                    let asset1Liquidity = 0;
                    let asset2Liquidity = 0;
                    
                    offers.forEach(offer => {
                        // Safely handle XRP amounts (in drops) vs. issued currency amounts
                        if (typeof offer.TakerPays === 'string') {
                            // TakerPays is XRP (in drops)
                            try {
                                // Only convert if it's a valid number string
                                if (/^-?[0-9]+$/.test(offer.TakerPays)) {
                                    asset1Liquidity += parseFloat(xrpl.dropsToXrp(offer.TakerPays));
                                }
                            } catch (e) {
                                console.log(`Skipping invalid TakerPays value: ${offer.TakerPays}`);
                            }
                        } else if (offer.TakerPays && offer.TakerPays.value) {
                            // TakerPays is issued currency
                            asset1Liquidity += parseFloat(offer.TakerPays.value);
                        }
                        
                        if (typeof offer.TakerGets === 'string') {
                            // TakerGets is XRP (in drops)
                            try {
                                // Only convert if it's a valid number string
                                if (/^-?[0-9]+$/.test(offer.TakerGets)) {
                                    asset2Liquidity += parseFloat(xrpl.dropsToXrp(offer.TakerGets));
                                }
                            } catch (e) {
                                console.log(`Skipping invalid TakerGets value: ${offer.TakerGets}`);
                            }
                        } else if (offer.TakerGets && offer.TakerGets.value) {
                            // TakerGets is issued currency
                            asset2Liquidity += parseFloat(offer.TakerGets.value);
                        }
                    });
                    
                    // Add pool data
                    poolData.push({
                        name: `${pool.asset1.currency}/${pool.asset2.currency}`,
                        offers: offers.length,
                        asset1Liquidity: asset1Liquidity.toFixed(2),
                        asset2Liquidity: asset2Liquidity.toFixed(2),
                        asset1Currency: pool.asset1.currency,
                        asset2Currency: pool.asset2.currency
                    });
                } catch (error) {
                    console.error(`Error fetching data for pool ${pool.asset1.currency}/${pool.asset2.currency}:`, error);
                }
            }
            
            await client.disconnect();
            
            if (poolData.length === 0 || poolData.every(pool => pool.offers === 0)) {
                // No pools found or all pools have 0 offers
                const noPoolsEmbed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('AMM Dashboard')
                    .setDescription('No active AMM pools found on the XRPL. AMM functionality is still in development.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [noPoolsEmbed] });
                return;
            }
            
            // Create dashboard embed
            const dashboardEmbed = new EmbedBuilder()
                .setColor('#9933FF')
                .setTitle('🏊 XRPL Liquidity Pools')
                .setDescription('Current liquidity pool data from the XRPL DEX')
                .setTimestamp();
            
            // Add fields for each pool
            poolData.forEach(pool => {
                dashboardEmbed.addFields({
                    name: `${pool.name} Pool`,
                    value: `Orders: ${pool.offers}\n` +
                           `${pool.asset1Currency} Liquidity: ${pool.asset1Liquidity}\n` +
                           `${pool.asset2Currency} Liquidity: ${pool.asset2Liquidity}`,
                    inline: true
                });
            });
            
            // Add note about AMM status
            dashboardEmbed.addFields({
                name: 'Note',
                value: 'Native AMM functionality is still in development on the XRPL. This data represents the current DEX liquidity.',
                inline: false
            });
            
            // Add buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_amm')
                        .setLabel('Refresh Data')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('quick_trade')
                        .setLabel('Trade Now')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💱')
                );
            
            await interaction.editReply({
                embeds: [dashboardEmbed],
                components: [row]
            });
            
        } catch (error) {
            console.error('Error in AMM dashboard:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('Failed to fetch AMM data. Please try again later.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
