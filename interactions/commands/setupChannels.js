import { SlashCommandBuilder } from '@discordjs/builders';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { startPriceUpdater } from '../../features/priceUpdater.js';
import { startVolumeUpdater } from '../../features/volumeUpdater.js';
import { startWhaleUpdater } from '../../features/whaleUpdater.js';
import { startNFTUpdater } from '../../features/nftActivityUpdater.js';
import { startAMMUpdater } from '../../features/ammUpdater.js';
import { ValidatorHealthMonitor } from '../../src/services/validatorHealthMonitor.js';
import { DeveloperEcosystemPulse } from '../../src/services/developerEcosystemPulse.js';
import serviceManager from '../../src/services/serviceManager.js';

export const data = new SlashCommandBuilder()
    .setName('setup-channels')
    .setDescription('Create auto-updating XRPL information channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    console.log('Command executed: setup-channels');
    
    try {
        // Create category
        let category = interaction.guild.channels.cache.find(
            c => c.name === '📊 XRPL Market Data' && c.type === ChannelType.GuildCategory
        );
        
        if (!category) {
            category = await interaction.guild.channels.create({
                name: '📊 XRPL Market Data',
                type: ChannelType.GuildCategory
            });
            console.log('Created XRPL Market Data category');
        }
        
        // Create all channels directly
        const channelsToCreate = [
            { name: '💰│xrp-price', description: 'Real-time XRP price updates' },
            { name: '📈│trading-volume', description: 'XRP trading volume statistics' },
            { name: '🐋│whale-alerts', description: 'Large XRP transactions alerts' },
            { name: '🎨│nft-activity', description: 'XRPL NFT marketplace activity' },
            { name: '🏊│amm-analytics', description: 'XRPL AMM statistics and updates' },
            { name: '🛡️-validator-health-monitor', description: 'XRPL validator health and status' },
            { name: '👨‍💻-developer-ecosystem-pulse', description: 'XRPL developer ecosystem updates' }
        ];
        
        const createdChannels = {};
        
        // Create each channel if it doesn't exist
        for (const channelInfo of channelsToCreate) {
            let channel = interaction.guild.channels.cache.find(c => {
                // For validator channel
                if (channelInfo.name.includes('validator-health')) {
                    return c.name.includes('validator-health');
                }
                // For developer ecosystem channel
                else if (channelInfo.name.includes('developer-ecosystem')) {
                    return c.name.includes('developer-ecosystem');
                }
                // For other channels
                else if (channelInfo.name.includes('│')) {
                    return c.name.includes(channelInfo.name.split('│')[1]);
                }
                // Exact match
                return c.name === channelInfo.name;
            });
            
            if (!channel) {
                channel = await interaction.guild.channels.create({
                    name: channelInfo.name,
                    type: ChannelType.GuildText,
                    topic: channelInfo.description,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.SendMessages],
                        }
                    ]
                });
                console.log(`Created ${channelInfo.name} channel`);
            } else {
                console.log(`${channelInfo.name} channel already exists`);
            }
            
            // Store channel ID
            const key = channelInfo.name.includes('validator-health') ? 'validator-health-monitor' :
                       channelInfo.name.includes('developer-ecosystem') ? 'developer-ecosystem-pulse' :
                       channelInfo.name.includes('│') ? channelInfo.name.split('│')[1] :
                        channelInfo.name.replace(/[^a-zA-Z0-9]/g, '-');
            
            createdChannels[key] = channel.id;
        }
        
        // Start all updaters
        if (createdChannels['xrp-price']) {
            startPriceUpdater(interaction.client, createdChannels['xrp-price']);
            console.log('Started price updater');
        }
        
        if (createdChannels['trading-volume']) {
            startVolumeUpdater(interaction.client, createdChannels['trading-volume']);
            console.log('Started volume updater');
        }
        
        if (createdChannels['whale-alerts']) {
            startWhaleUpdater(interaction.client, createdChannels['whale-alerts']);
            console.log('Started whale updater');
        }
        
        if (createdChannels['nft-activity']) {
            startNFTUpdater(interaction.client, createdChannels['nft-activity']);
            console.log('Started NFT updater');
        }
        
        if (createdChannels['amm-analytics']) {
            startAMMUpdater(interaction.client, createdChannels['amm-analytics']);
            console.log('Started AMM updater');
        }
        
        // Start validator health monitor
        if (createdChannels['validator-health-monitor']) {
            console.log(`Starting validator monitor with channel ID: ${createdChannels['validator-health-monitor']}`);
            const validatorMonitor = new ValidatorHealthMonitor(
                interaction.client, 
                createdChannels['validator-health-monitor']
            );
            
            // Manually register with service manager
            serviceManager.registerService('validator-health-monitor', validatorMonitor);
            
            console.log('ValidatorHealthMonitor instance created, starting automated updates...');
            
            await validatorMonitor.startAutomatedUpdates();
            
            console.log('ValidatorHealthMonitor.startAutomatedUpdates completed');
            
            // Check if the service was registered:
            const registeredService = serviceManager.getService('validator-health-monitor');
            console.log(`Validator service registered: ${registeredService ? 'Yes' : 'No'}`);
        }
        
        // Start developer ecosystem pulse
        if (createdChannels['developer-ecosystem-pulse']) {
            const devEcosystemPulse = new DeveloperEcosystemPulse(
                interaction.client, 
                createdChannels['developer-ecosystem-pulse']
            );
            
            // Manually register with service manager
            serviceManager.registerService('developer-ecosystem-pulse', devEcosystemPulse);
            
            console.log(`Starting developer ecosystem pulse with channel ID: ${createdChannels['developer-ecosystem-pulse']}`);
            
            console.log('DeveloperEcosystemPulse instance created, starting automated updates...');
            
            await devEcosystemPulse.startAutomatedUpdates();
            
            console.log('DeveloperEcosystemPulse.startAutomatedUpdates completed');
            
            // Check if the service was registered:
            const registeredService = serviceManager.getService('developer-ecosystem-pulse');
            console.log(`Developer ecosystem service registered: ${registeredService ? 'Yes' : 'No'}`);
        }
        
        // Final success message
        await interaction.editReply({
            content: "✅ XRPL information channels have been set up and all feeds are running!\n\n" +
                     "📊 Update Intervals:\n" +
                     "• Price & Volume: Real-time\n" +
                     "• Validator Health: Every 15 minutes\n" +
                     "• Developer Ecosystem: Every 30 minutes\n" +
                     "• Whale Alerts: As transactions occur\n" +
                     "• NFT Activity: As transactions occur\n" +
                     "• AMM Analytics: Real-Time",
            ephemeral: true
        });
    } catch (error) {
        console.error('Setup error:', error);
        await interaction.editReply({
            content: `Error setting up channels: ${error.message}`,
            ephemeral: true
        });
    }
}

export default { data, execute };