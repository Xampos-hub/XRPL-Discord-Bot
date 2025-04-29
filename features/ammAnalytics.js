import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';
import QuickChart from 'quickchart-js';

export async function startAMMAnalytics(client, channelId) {
    const xrplClient = new xrpl.Client("wss://s1.ripple.com");
    await xrplClient.connect();
    
    console.log('AMM Analytics monitoring started');
    
    // Track historical data for charts
    const poolData = {
        'XRP/USD': {
            timestamps: [],
            liquidity: [],
            volume: [],
            fees: []
        }
    };
    
    // Update every 30 minutes
    setInterval(async () => {
        try {
            // Get AMM data for XRP/USD pool
            const ammInfo = await xrplClient.request({
                command: "amm_info",
                asset: { currency: "XRP" },
                asset2: { 
                    currency: "USD",
                    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
                }
            });
            
            if (!ammInfo.result || !ammInfo.result.amm) {
                console.log('No AMM data available');
                return;
            }
            
            // Extract data
            const amm = ammInfo.result.amm;
            const timestamp = new Date();
            const xrpBalance = xrpl.dropsToXrp(amm.amount.value);
            const usdBalance = amm.amount2.value;
            const lpTokens = amm.lp_token.value;
            const tradingFee = (parseFloat(amm.trading_fee) / 10000).toFixed(4);
            
            // Calculate total liquidity in USD (simplified)
            const totalLiquidity = parseFloat(usdBalance) * 2;
            
            // Update historical data
            poolData['XRP/USD'].timestamps.push(timestamp);
            poolData['XRP/USD'].liquidity.push(totalLiquidity);
            
            // Keep only last 24 data points (12 hours)
            if (poolData['XRP/USD'].timestamps.length > 24) {
                poolData['XRP/USD'].timestamps.shift();
                poolData['XRP/USD'].liquidity.shift();
            }
            
            // Generate liquidity chart
            const chart = new QuickChart();
            chart.setConfig({
                type: 'line',
                data: {
                    labels: poolData['XRP/USD'].timestamps.map(t => t.toLocaleTimeString()),
                    datasets: [{
                        label: 'Total Liquidity (USD)',
                        data: poolData['XRP/USD'].liquidity,
                        borderColor: '#9933FF',
                        backgroundColor: 'rgba(153, 51, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'XRP/USD Pool Liquidity',
                            color: '#ffffff',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#ffffff'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        y: {
                            ticks: {
                                color: '#ffffff'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
            
            chart.setWidth(800);
            chart.setHeight(400);
            chart.setBackgroundColor('#2f3136');
            
            // Create embed
            const ammEmbed = new EmbedBuilder()
                .setColor('#9933FF')
                .setTitle('🏊 XRP/USD AMM Pool Analytics')
                .setDescription('Real-time XRPL Automated Market Maker Data')
                .addFields(
                    { name: 'XRP Balance', value: `${parseFloat(xrpBalance).toLocaleString()} XRP`, inline: true },
                    { name: 'USD Balance', value: `$${parseFloat(usdBalance).toLocaleString()}`, inline: true },
                    { name: 'Total Liquidity', value: `$${totalLiquidity.toLocaleString()}`, inline: true },
                    { name: 'LP Tokens', value: parseFloat(lpTokens).toLocaleString(), inline: true },
                    { name: 'Trading Fee', value: `${tradingFee}%`, inline: true },
                    { name: 'Pool Address', value: amm.account.substring(0, 10) + '...', inline: true }
                )
                .setImage(chart.getUrl())
                .setTimestamp();
                
            const channel = client.channels.cache.get(channelId);
            if (channel) {
                await channel.send({ embeds: [ammEmbed] });
            }
        } catch (error) {
            console.error('AMM analytics error:', error);
        }
    }, 1800000); // 30 minutes
}

constructor(client, channelId) {
    this.discordClient = client;
    this.channelId = channelId;
    this.xrplServers = [
        'wss://xrplcluster.com',
        'wss://s1.ripple.com',
        'wss://s2.ripple.com',
        'wss://rippled.xrpl-labs.com'
    ];
    this.currentServerIndex = 0;
    this.xrplServer = this.xrplServers[this.currentServerIndex];
    this.client = new xrpl.Client(this.xrplServer);
    
    // Rest of your constructor code
}

// Add a method to rotate through servers
rotateServer() {
    this.currentServerIndex = (this.currentServerIndex + 1) % this.xrplServers.length;
    this.xrplServer = this.xrplServers[this.currentServerIndex];
    console.log(`Rotating to next XRPL server: ${this.xrplServer}`);
    this.client = new xrpl.Client(this.xrplServer);
    
    // Re-attach event listeners to the new client
    this.setupEventListeners();
}

setupEventListeners() {
    this.client.on('error', (errorCode, errorMessage) => {
        console.log(`AMM client error: ${errorCode}: ${errorMessage}`);
        this.reconnectClient();
    });
    
    this.client.on('disconnected', (code) => {
        console.log(`AMM client disconnected with code: ${code}`);
        this.reconnectClient();
    });
    
    this.client.on('reconnect', () => {
        console.log('AMM client reconnecting...');
    });
}

async reconnectClient() {
    try {
        if (this.client.isConnected()) {
            await this.client.disconnect();
        }
        
        // Try current server first
        try {
            console.log(`Attempting to reconnect AMM client to ${this.xrplServer} in 5 seconds...`);
            setTimeout(async () => {
                try {
                    await this.client.connect();
                    console.log('AMM client reconnected successfully');
                } catch (error) {
                    console.error('AMM client reconnection failed, rotating servers');
                    this.rotateServer();
                    setTimeout(() => this.reconnectClient(), 5000);
                }
            }, 5000);
        } catch (error) {
            console.error('Error during AMM client reconnection process:', error);
            this.rotateServer();
            setTimeout(() => this.reconnectClient(), 5000);
        }
    } catch (error) {
        console.error('Fatal error during AMM client reconnection:', error);
    }
}

async fetchAMMData() {
    try {
        // Check if client is connected before making requests
        if (!this.client.isConnected()) {
            console.log('AMM client not connected, attempting to connect...');
            await this.client.connect();
        }
        
        // Your existing AMM data fetching code
        const response = await this.client.request({
            command: 'amm_info',
            asset: { currency: "XRP" },
            asset2: { 
                currency: "USD",
                issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
            }
        });
        
        return response.result;
    } catch (error) {
        console.error('AMM update error:', error);
        
        // Handle specific error types
        if (error.message && error.message.includes('WebSocket is not open')) {
            this.reconnectClient();
            return null; // Return null to indicate fetch failure
        }
        
        // For other errors, just return null
        return null;
    }
}

async sendUpdate() {
    try {
        const ammData = await this.fetchAMMData();
        
        // If data fetch failed, send a simplified message and exit
        if (!ammData) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('🔄 AMM Analytics - Connection Issue')
                .setColor('#ff9900')
                .setDescription('Unable to fetch AMM data due to connection issues. Will retry shortly.')
                .setTimestamp();
                
            const channel = this.client.channels.cache.get(this.channelId);
            if (channel) {
                await channel.send({ embeds: [errorEmbed] });
            }
            return;
        }
        
        // Your existing code to process and send AMM data
        // ...
    } catch (error) {
        console.error('Error sending AMM update:', error);
    }
}
