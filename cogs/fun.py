import discord
from discord.ext import commands

class Fun(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def penis(self, ctx):
        await ctx.send("8==D 🚀")

    @commands.command()
    async def moon(self, ctx):
        await ctx.send("🚀Happy Penis TO THE MOON! 🌕")

async def setup(bot):
    await bot.add_cog(Fun(bot))
