import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandNames = new Set();
const commandFiles = fs.readdirSync('./interactions/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = await import(`./interactions/commands/${file}`);
        
        // Check if command.default exists
        if (!command.default) {
            console.error(`❌ Error in file ${file}: Missing default export`);
            continue;
        }
        
        // Check if command.default.data exists
        if (!command.default.data) {
            console.error(`❌ Error in file ${file}: Missing data property in default export`);
            continue;
        }
        
        // Check for duplicate command names
        if (commandNames.has(command.default.data.name)) {
            console.error(`❌ Duplicate command name: ${command.default.data.name} in file ${file}`);
            continue;
        }
        
        commandNames.add(command.default.data.name);
        commands.push(command.default.data.toJSON());
        console.log(`✅ Registered command: ${command.default.data.name}`);
    } catch (error) {
        console.error(`❌ Error loading command from file ${file}:`, error);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
    process.exit(0);
} catch (error) {
    console.error(error);
}