import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord.js';
import serviceManager from '../../src/services/serviceManager.js';
import { ValidatorHealthMonitor } from '../../src/services/validatorHealthMonitor.js';
import { DeveloperEcosystemPulse } from '../../src/services/developerEcosystemPulse.js';

export const data = new SlashCommandBuilder()
    .setName('restart-service')
    .setDescription('Restart a specific service')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName('service')
            .setDescription('The service to restart')
            .setRequired(true)
            .addChoices(
                { name: 'Validator Health Monitor', value: 'validator-health-monitor' },
                { name: 'Developer Ecosystem Pulse', value: 'developer-ecosystem-pulse' }
            )
    );

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const serviceName = interaction.options.getString('service');
        const service = serviceManager.getService(serviceName);
        
        if (!service) {
            return await interaction.editReply({
                content: `Service ${serviceName} not found. Use /setup-channels to start services.`,
                ephemeral: true
            });
        }
        
        // Get the channel ID from the existing service
        const channelId = service.channelId;
        
        // Clean up the existing service
        service.cleanup();
        
        // Create and start a new service instance
        if (serviceName === 'validator-health-monitor') {
            const validatorMonitor = new ValidatorHealthMonitor(interaction.client, channelId);
            await validatorMonitor.startAutomatedUpdates();
        } else if (serviceName === 'developer-ecosystem-pulse') {
            const devEcosystemPulse = new DeveloperEcosystemPulse(interaction.client, channelId);
            await devEcosystemPulse.startAutomatedUpdates();
        }
        
        await interaction.editReply({
            content: `✅ Service ${serviceName} has been restarted successfully!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Service restart error:', error);
        await interaction.editReply({
            content: `Error restarting service: ${error.message}`,
            ephemeral: true
        });
    }
}

export default { data, execute };