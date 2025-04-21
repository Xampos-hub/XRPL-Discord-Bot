import discord
from discord.ext import commands

class Example(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def ping(self, ctx):
        """Check the bot's response time
        Shows the current latency between the bot and Discord servers
        """
        await ctx.send(f'Pong! {round(self.bot.latency * 1000)}ms')

async def setup(bot):
    await bot.add_cog(Example(bot))
    await bot.add_cog(Example(bot))