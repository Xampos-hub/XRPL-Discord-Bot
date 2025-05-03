import { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DONATIONS_FILE = path.join(__dirname, '..', '..', 'data', 'donations.json');

export default {
    data: new SlashCommandBuilder()
        .setName('setup-donations')
        .setDescription('Set up donation/tipping for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR),
    
    async execute(interaction) {
        // Create a modal for setting up donations
        const modal = new ModalBuilder()
            .setCustomId('setup_donations_modal')
            .setTitle('Set Up Server Donations');
        
        // Add input fields
        const addressInput = new TextInputBuilder()
            .setCustomId('donation_address')
            .setLabel('XRPL Wallet Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
            .setRequired(true);
            
        const purposeInput = new TextInputBuilder()
            .setCustomId('donation_purpose')
            .setLabel('Purpose (e.g. Server Costs, Events, etc.)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Server Maintenance and Events')
            .setRequired(true);
            
        const messageInput = new TextInputBuilder()
            .setCustomId('donation_message')
            .setLabel('Custom Message to Donors')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Thank you for supporting our server! Your donations help us...')
            .setRequired(false);
            
        // Add rows
        const addressRow = new ActionRowBuilder().addComponents(addressInput);
        const purposeRow = new ActionRowBuilder().addComponents(purposeInput);
        const messageRow = new ActionRowBuilder().addComponents(messageInput);
        
        // Add components to modal
        modal.addComponents(addressRow, purposeRow, messageRow);
        
        // Show the modal
        await interaction.showModal(modal);
    },
    
    // Add this handleDonationSetup method
    async handleDonationSetup(interaction) {
        try {
            console.log("Donation setup modal submitted");
            const donationAddress = interaction.fields.getTextInputValue('donation_address');
            const purpose = interaction.fields.getTextInputValue('donation_purpose');
            const message = interaction.fields.getTextInputValue('donation_message') || "";
            
            // Validate XRPL address
            if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(donationAddress)) {
                // Use safeReply helper function to handle already replied interactions
                await this.safeReply(interaction, {
                    content: 'Invalid XRPL address format. Please try again with a valid address.',
                    ephemeral: true
                });
                return;
            }
            
            // Save donation setup
            const serverId = interaction.guildId;
            
            // Read current data
            let donations;
            try {
                const data = await fs.readFile(DONATIONS_FILE, 'utf8');
                donations = JSON.parse(data);
            } catch (error) {
                // If file doesn't exist or is invalid, start fresh
                donations = { servers: {} };
            }
            
            // Update with new info
            donations.servers[serverId] = {
                address: donationAddress,
                purpose: purpose,
                message: message,
                setupBy: interaction.user.id,
                setupDate: new Date().toISOString()
            };
            
            // Write back to file
            await fs.writeFile(DONATIONS_FILE, JSON.stringify(donations, null, 2));
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Donation System Set Up Successfully')
                .setDescription(`Your server is now ready to receive donations and tips!`)
                .addFields(
                    { name: 'Donation Address', value: `\`${donationAddress}\``, inline: true },
                    { name: 'Purpose', value: purpose, inline: true },
                )
                .addFields(
                    { name: 'How Users Can Donate', value: 'Users can use the `/tip` command to make donations to the server.' }
                )
                .setTimestamp();
                
            // Use safeReply helper function to handle already replied interactions
            await this.safeReply(interaction, {
                embeds: [successEmbed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error processing donation setup:', error);
            // Use safeReply helper function to handle already replied interactions
            await this.safeReply(interaction, {
                content: 'There was an error setting up donations. Please try again.',
                ephemeral: true
            });
        }
    },

    // Helper method to safely reply to interactions
    async safeReply(interaction, options) {
        try {
            if (interaction.deferred) {
                return await interaction.editReply(options);
            } else if (interaction.replied) {
                return await interaction.followUp(options);
            } else {
                return await interaction.reply(options);
            }
        } catch (error) {
            console.error('Error in safeReply:', error);
        }
    }
};