import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord.js';
import serviceManager from '../../src/services/serviceManager.js';

export const data = new SlashCommandBuilder()
    .setName('test-service-manager')
    .setDescription('Test the service manager')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        console.log('Testing service manager...');
        
        // Create a test service
        const testService = {
            name: 'test-service',
            updateInterval: setInterval(() => {}, 1000),
            cleanup() {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        };
        
        // Register the test service
        serviceManager.registerService('test-service', testService);
        
        // Check if the service was registered
        const registeredService = serviceManager.getService('test-service');
        const isRegistered = registeredService ? 'Yes' : 'No';
        
        // Get all services
        const allServices = serviceManager.getAllServices();
        const serviceCount = allServices.length;
        
        // Clean up the test service
        if (registeredService) {
            registeredService.cleanup();
        }
        
        await interaction.editReply({
            content: `Service Manager Test Results:\n` +
                     `- Test service registered: ${isRegistered}\n` +
                     `- Total services: ${serviceCount}\n` +
                     `- Service names: ${allServices.map(([name]) => name).join(', ')}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Service manager test error:', error);
        await interaction.editReply({
            content: `Error testing service manager: ${error.message}`,
            ephemeral: true
        });
    }
}

export default { data, execute };