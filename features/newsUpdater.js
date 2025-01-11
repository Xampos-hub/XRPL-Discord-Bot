import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export async function startNewsUpdater(client, channelId) {
    setInterval(async () => {
        try {
            // Fetch all data including Fear & Greed Index
            const [news, fearGreedResponse] = await Promise.all([
                Promise.all([
                    fetch(`https://api.coingecko.com/api/v3/coins/ripple/status_updates`),
                    fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/news?symbol=XRP`, {
                        headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY }
                    }),
                    fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT'),
                    fetch('https://xrpl.org/blog.json')
                ]).then(responses => Promise.all(responses.map(res => res.json()))),
                fetch('https://api.alternative.me/fng/').then(res => res.json())
            ]);

            const fearGreedValue = fearGreedResponse.data[0].value;
            const fearGreedClass = getFearGreedClass(fearGreedValue);

            const newsEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('📰 XRPL Ecosystem News & Market Sentiment')
                .setDescription('Latest updates from major platforms')
                .addFields(
                    { name: '🎯 Market Fear & Greed Index', value: `${fearGreedValue}/100 - ${fearGreedClass}`, inline: false },
                    { name: '🦎 CoinGecko Updates', value: formatCoinGeckoNews(news[0]) },
                    { name: '📊 CoinMarketCap News', value: formatCMCNews(news[1]) },
                    { name: '📈 Binance Market Updates', value: formatBinanceUpdates(news[2]) },
                    { name: '🔗 XRPL.org Updates', value: formatXRPLNews(news[3]) }
                )
                .setImage('https://alternative.me/crypto/fear-and-greed-index.png')
                .setTimestamp();

            const channel = client.channels.cache.get(channelId);
            if (channel) {
                await channel.send({ embeds: [newsEmbed] });
            }
        } catch (error) {
            console.error('News update error:', error);
        }
    }, 10800000); // 3 hours interval
}

function getFearGreedClass(value) {
    if (value >= 90) return 'Extreme Greed 🔥';
    if (value >= 75) return 'Greed 😈';
    if (value >= 50) return 'Neutral 😐';
    if (value >= 25) return 'Fear 😨';
    return 'Extreme Fear 😱';
}

function formatCoinGeckoNews(data) {
    return data.status_updates
        .slice(0, 3)
        .map(update => `• ${update.description.substring(0, 100)}...`)
        .join('\n') || 'No recent updates';
}

function formatCMCNews(data) {
    return data.data
        .slice(0, 3)
        .map(article => `• [${article.title}](${article.url})`)
        .join('\n') || 'No recent news';
}

function formatBinanceUpdates(data) {
    return `Price: ${parseFloat(data.lastPrice).toFixed(4)}\n24h Volume: ${parseFloat(data.volume).toFixed(2)}`;
}

function formatXRPLNews(data) {
    return data.items
        .slice(0, 3)
        .map(item => `• [${item.title}](${item.url})`)
        .join('\n') || 'No recent updates';
}