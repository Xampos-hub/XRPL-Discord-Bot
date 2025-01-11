import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function startAMMUpdater(client, channelId) {
    const xrplClient = new xrpl.Client("wss://s1.ripple.com");
    await xrplClient.connect();

    setInterval(async () => {
        try {
            const orderBookRequest = {
                command: "book_offers",
                taker_gets: {
                    currency: "USD",
                    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
                },
                taker_pays: {
                    currency: "XRP"
                },
                limit: 10
            };

            const response = await xrplClient.request(orderBookRequest);
            const offers = response.result.offers || [];

            const ammEmbed = new EmbedBuilder()
                .setColor('#9933FF')
                .setTitle('🏊 Liquidity Pool Analytics')
                .setDescription('Real-time Pool Data')
                .addFields(
                    {
                        name: 'XRP/USD Pool',
                        value: `Total Orders: ${offers.length}\nBest Price: ${offers[0] ? parseFloat(offers[0].quality).toFixed(4) : 'N/A'}\nTotal Liquidity: ${offers.reduce((sum, offer) => sum + parseFloat(offer.TakerGets.value || 0), 0).toFixed(2)} USD`,
                        inline: false
                    },
                    {
                        name: 'Recent Activity',
                        value: offers.slice(0, 3).map(o => `${xrpl.dropsToXrp(o.TakerPays)} XRP @ ${parseFloat(o.quality).toFixed(4)} USD`).join('\n') || 'No recent activity',
                        inline: false
                    }
                )
                .setTimestamp();

            const channel = client.channels.cache.get(channelId);
            if (channel) {
                await channel.send({ embeds: [ammEmbed] });
            }
        } catch (error) {
            console.error('AMM update error:', error);
        }
    }, 20000);
}