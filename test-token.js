import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

console.log("Environment variables loaded:", Object.keys(process.env));
console.log("Token exists:", !!process.env.DISCORD_TOKEN);
console.log("Token length:", process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);

// Create a simple client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Log when ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.destroy(); // Disconnect after successful login
});

// Try to login with the token directly from .env
console.log("Attempting to login...");
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log("Login successful"))
    .catch(error => {
        console.error("Login failed:", error.message);
        
        // Try with a hardcoded token (replace with your actual token)
        console.log("\nTrying with hardcoded token...");
        // Uncomment and replace YOUR_TOKEN_HERE with your actual token
        // return client.login("YOUR_TOKEN_HERE");
    });
