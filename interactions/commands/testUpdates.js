import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord.js';
import { ValidatorHealthMonitor } from '../../src/services/validatorHealthMonitor.js';
import { DeveloperEcosystemPulse } from '../../src/services/developerEcosystemPulse.js';

export const data = new SlashCommandBuilder()
    .setName('test-updates')
    .setDescription('Manually trigger updates for validator and developer channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Find the validator channel
        const validatorChannel = interaction.guild.channels.cache.find(
            channel => channel.name.includes('validator-health')
        );
        
        // Find the developer ecosystem channel
        const devEcosystemChannel = interaction.guild.channels.cache.find(
            channel => channel.name.includes('developer-ecosystem')
        );
        
        let response = '';
        
        if (validatorChannel) {
            response += `Found validator channel: ${validatorChannel.name} (${validatorChannel.id})\n`;
            const validatorMonitor = new ValidatorHealthMonitor(interaction.client, validatorChannel.id);
            await validatorMonitor.sendUpdate();
            response += `Manually triggered validator update\n\n`;
        } else {
            response += `Validator channel not found\n\n`;
        }
        
        if (devEcosystemChannel) {
            response += `Found developer ecosystem channel: ${devEcosystemChannel.name} (${devEcosystemChannel.id})\n`;
            const devEcosystemPulse = new DeveloperEcosystemPulse(interaction.client, devEcosystemChannel.id);
            await devEcosystemPulse.sendUpdate();
            response += `Manually triggered developer ecosystem update\n`;
        } else {
            response += `Developer ecosystem channel not found\n`;
        }
        
        await interaction.editReply({
            content: `✅ Test updates triggered\n\n${response}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Test updates error:', error);
        await interaction.editReply({
            content: `Error triggering test updates: ${error.message}`,
            ephemeral: true
        });
    }
}

export default { data, execute };