import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export async function startVolumeUpdater(client, channelId) {
    setInterval(async () => {
        try {
            const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT');
            const binanceData = await binanceResponse.json();

            const channel = client.channels.cache.get(channelId);
            if (channel) {
                const volumeEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('XRP Trading Volume Update')
                    .addFields(
                        { name: 'Binance Volume', value: `${parseFloat(binanceData.volume * binanceData.weightedAvgPrice).toFixed(2)}`, inline: true },
                        { name: 'Price Change', value: `${parseFloat(binanceData.priceChangePercent).toFixed(2)}%`, inline: true },
                        { name: 'Number of Trades', value: binanceData.count.toString(), inline: true },
                        { name: 'Time', value: new Date().toLocaleTimeString() }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [volumeEmbed] });
            }
        } catch (error) {
            console.error('Volume update error:', error);
        }
    }, 20000);
}