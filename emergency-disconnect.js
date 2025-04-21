import { SlashCommandBuilder } from '@discordjs/builders';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('emergency-disconnect')
        .setDescription('Emergency command to disconnect all wallets'),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const userId = interaction.user.id;
            const walletFilePath = path.join(__dirname, '..', 'data', 'wallets', `${userId}.json`);
            
            console.log(`Emergency disconnect for user ${userId}, file path: ${walletFilePath}`);
            
            try {
                // Check if file exists
                await fs.access(walletFilePath);
                
                // Delete the file
                await fs.unlink(walletFilePath);
                
                console.log(`Successfully deleted wallet file for user ${userId}`);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Emergency Disconnect Successful')
                    .setDescription('All your connected wallets have been disconnected.')
                    .setTimestamp();
                
                await interaction.editReply({
                    embeds: [successEmbed]
                });
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`No wallet file found for user ${userId}`);
                    
                    await interaction.editReply({
                        content: "You don't have any connected wallets to disconnect."
                    });
                } else {
                    console.error(`Error during emergency disconnect for user ${userId}:`, error);
                    
                    await interaction.editReply({
                        content: `Error during emergency disconnect: ${error.message}. Please try again.`
                    });
                }
            }
        } catch (error) {
            console.error('Unexpected error in emergency-disconnect command:', error);
            
            try {
                await interaction.editReply({
                    content: 'An unexpected error occurred. Please try again.'
                });
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    }
}
