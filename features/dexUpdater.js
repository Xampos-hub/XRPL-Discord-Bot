import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function startDexUpdater(client, channelId) {
    const xrplClient = new xrpl.Client("wss://s1.ripple.com");
    await xrplClient.connect();

    setInterval(async () => {
        try {
            const orderBookRequest = {
                command: "book_offers",
                taker_pays: {
                    currency: "USD",
                    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
                },
                taker_gets: {
                    currency: "XRP"
                },
                limit: 5
            };

            const response = await xrplClient.request(orderBookRequest);
            const offers = response.result.offers || [];
            
            const bestPrice = offers[0] ? 
                (parseFloat(offers[0].TakerPays.value) / parseFloat(xrpl.dropsToXrp(offers[0].TakerGets))).toFixed(4) : 
                'N/A';

            const dexEmbed = new EmbedBuilder()
                .setColor('#FF9500')
                .setTitle('🔄 XRPL DEX Analytics')
                .setDescription('Real-time Market Data')
                .addFields(
                    {
                        name: '📊 XRP/USD Market',
                        value: `Best Price: ${bestPrice} USD\nOrders: ${offers.length}\nTotal Depth: ${offers.reduce((sum, offer) => sum + parseFloat(xrpl.dropsToXrp(offer.TakerGets)), 0).toFixed(2)} XRP`,
                        inline: false
                    }
                )
                .setTimestamp();

            const channel = client.channels.cache.get(channelId);
            if (channel) {
                await channel.send({ embeds: [dexEmbed] });
            }
        } catch (error) {
            console.error('DEX update error:', error);
        }
    }, 20000);
}