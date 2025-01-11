  import { EmbedBuilder } from 'discord.js';
  import WebSocket from 'ws';
  import fetch from 'node-fetch';
  import QuickChart from 'quickchart-js';

  export async function startPriceUpdater(client, channelId) {
      const ws = new WebSocket('wss://s.altnet.rippletest.net:51233');
      let priceHistory = [];
    
      ws.on('open', () => {
          console.log('WebSocket connected for price updates');
          setInterval(async () => {
              try {
                  const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT');
                  const data = await response.json();
                
                  const weekResponse = await fetch('https://api.binance.com/api/v3/klines?symbol=XRPUSDT&interval=7d&limit=1');
                  const weekData = await weekResponse.json();
                
                  // Update price history
                  priceHistory.push(parseFloat(data.lastPrice));
                  if (priceHistory.length > 20) priceHistory.shift();

                  // Generate chart
                  const chart = new QuickChart();
                  chart.setConfig({
                      type: 'line',
                      data: {
                          labels: Array(priceHistory.length).fill(''),
                          datasets: [{
                              label: 'XRP Price',
                              data: priceHistory,
                              borderColor: '#0099ff',
                              backgroundColor: 'rgba(0, 153, 255, 0.1)',
                              borderWidth: 2,
                              fill: true,
                              tension: 0.4,
                              pointRadius: 0
                          }]
                      },
                      options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                              legend: {
                                  display: false
                              }
                          },
                          scales: {
                              x: {
                                  display: false
                              },
                              y: {
                                  display: true,
                                  grid: {
                                      color: 'rgba(255, 255, 255, 0.1)'
                                  },
                                  ticks: {
                                      color: '#ffffff'
                                  }
                              }
                          }
                      }
                  });

                  chart.setWidth(800);
                  chart.setHeight(300);
                  chart.setBackgroundColor('#2f3136');
                
                  const channel = client.channels.cache.get(channelId);
                  if (channel) {
                      const priceEmbed = new EmbedBuilder()
                          .setColor('#00ff00')
                          .setTitle('💠 Ripple (XRP) in USD')
                          .addFields(
                              { name: '💰 Price', value: `${parseFloat(data.lastPrice).toFixed(4)}`, inline: false },
                              { name: '📈 Highest in 24h', value: `${parseFloat(data.highPrice).toFixed(4)}`, inline: true },
                              { name: '📉 Lowest in 24h', value: `${parseFloat(data.lowPrice).toFixed(4)}`, inline: true },
                              { name: '⏰ Change in 1h', value: `${data.priceChangePercent > 0 ? '+' : ''}${parseFloat(data.priceChangePercent).toFixed(2)}%`, inline: true },
                              { name: '📊 Change in 24h', value: `${data.priceChangePercent > 0 ? '+' : ''}${parseFloat(data.priceChangePercent).toFixed(2)}%`, inline: true },
                              { name: '📅 Change in 7d', value: `${weekData[0] ? ((data.lastPrice - weekData[0][1]) / weekData[0][1] * 100).toFixed(2) : '0'}%`, inline: true }
                          )
                          .setImage(chart.getUrl())
                          .setTimestamp();

                      await channel.send({ embeds: [priceEmbed] });
                  }
              } catch (error) {
                  console.error('Price update error:', error);
              }
          }, 10000);
      });

      ws.on('error', console.error);
  }