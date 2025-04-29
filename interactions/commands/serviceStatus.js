import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import serviceManager from '../../src/services/serviceManager.js';

export const data = new SlashCommandBuilder()
    .setName('service-status')
    .setDescription('Check the status of all running services')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const services = serviceManager.getAllServices();
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Service Status')
            .setColor('#0099ff')
            .setDescription(`Status of ${services.length} registered services`)
            .setTimestamp();
        
        if (services.length === 0) {
            embed.addFields({
                name: 'No Services Running',
                value: 'No services are currently registered. Use /setup-channels to start services.'
            });
        } else {
            services.forEach(([name, service]) => {
                const isRunning = service.updateInterval ? true : false;
                const channelName = interaction.client.channels.cache.get(service.channelId)?.name || 'Unknown channel';
                
                embed.addFields({
                    name: `${isRunning ? '✅' : '❌'} ${name}`,
                    value: `Channel: ${channelName}\nInterval: ${service.intervalTime / (60 * 1000)} minutes\nStatus: ${isRunning ? 'Running' : 'Stopped'}`
                });
            });
        }
        
        await interaction.editReply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Service status error:', error);
        await interaction.editReply({
            content: `Error checking service status: ${error.message}`,
            ephemeral: true
        });
    }
}

export default { data, execute };