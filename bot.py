import discord
from discord.ext import commands
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True

class CustomHelpCommand(commands.HelpCommand):
    async def send_bot_help(self, mapping):
        embed = discord.Embed(title="Happy Penis Bot Commands", color=0xFF69B4)
        
        # Coin Info Commands
        coin_info = """
        `!price` - Shows current HP price
        `!info` - Shows coin information
        `!stats` - Shows token statistics
        `!moon` - To the moon!
        `!penis` - Shows our logo
        """
        embed.add_field(name="🪙 Coin Information", value=coin_info, inline=False)
        
        # Social Commands
        social = """
        `!twitter` - Official Twitter
        `!telegram` - Join our Telegram
        `!website` - Visit our website
        """
        embed.add_field(name="🌐 Social Media", value=social, inline=False)
        
        # Fun Commands
        fun = """
        `!moon` - Launch to the moon!
        `!penis` - Show some love
        """
        embed.add_field(name="🎮 Fun", value=fun, inline=False)
        
        await self.get_destination().send(embed=embed)

bot = commands.Bot(
    command_prefix='!',
    intents=intents,
    help_command=CustomHelpCommand()
)
# Store API credentials as bot attributes for cogs to access
bot.TWITTER_API_KEY = os.getenv('TWITTER_API_KEY')
bot.TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET')
bot.TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN')
bot.TWITTER_ACCESS_SECRET = os.getenv('TWITTER_ACCESS_SECRET')
bot.TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
bot.TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

async def load_extensions():
    for filename in os.listdir('./cogs'):
        if filename.endswith('.py') and not filename.startswith('__'):
            try:
                # Check if extension is already loaded
                if f'cogs.{filename[:-3]}' not in bot.extensions:
                    await bot.load_extension(f'cogs.{filename[:-3]}')
                    print(f'Loaded {filename[:-3]}')
            except Exception as e:
                print(f'Failed to load {filename[:-3]}: {str(e)}')
@bot.event
async def on_ready():
    print(f'{bot.user} is ready and online!')
    await load_extensions()

bot.run('MTI5ODY5OTQ2MzA5ODg5NjQ4NA.GOB6Zm.ZWpp1_utx6DMqEt22YUyPdQJNYZ6IFattyLgog')