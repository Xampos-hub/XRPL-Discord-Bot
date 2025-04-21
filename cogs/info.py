import discord
from discord.ext import commands

class Information(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def price(self, ctx):
        await ctx.send("Current HP Price: $X.XX 🚀")

    @commands.command()
    async def info(self, ctx):
        embed = discord.Embed(title="Happy Penis Coin Info", color=0xFF69B4)
        embed.add_field(name="Network", value="Solana", inline=True)
        embed.add_field(name="Contract", value="GgzjNE5YJ8FQ4r1Ts4vfUUq87ppv5qEZQ9uumVM7txGs", inline=True)
        embed.add_field(name="Website", value="https://happypenis.meme/", inline=False)
        embed.add_field(name="Chart", value="Your_Chart_Link", inline=True)
        await ctx.send(embed=embed)

    @commands.command()
    async def stats(self, ctx):
        embed = discord.Embed(title="HP Token Statistics", color=0xFF69B4)
        embed.add_field(name="24h Volume", value="$XXX,XXX", inline=True)
        embed.add_field(name="Market Cap", value="$XXX,XXX", inline=True)
        embed.add_field(name="Holders", value="X,XXX", inline=True)
        embed.add_field(name="Liquidity", value="$XXX,XXX", inline=True)
        await ctx.send(embed=embed)

    @commands.command()
    async def commands(self, ctx):
        embed = discord.Embed(title="HP Coin Bot Commands", color=0x00ff00)
        embed.add_field(name="Moderation", value="""
        !clear [number] - Clear messages
        !mute @user [reason] - Mute a user
        !unmute @user - Unmute a user
        !announce #channel message - Send announcement
        !kick @user [reason] - Kick a user
        !ban @user [reason] - Ban a user
        !warn @user [reason] - Warn a user
        !lock [#channel] - Lock a channel
        !unlock [#channel] - Unlock a channel
        !modlog [number] - View moderation logs
        !antiraid [on/off] - Toggle raid protection
        """, inline=False)
        embed.add_field(name="Coin Info", value="""
        !price - Shows current price
        !info - Shows coin information
        !moon - To the moon!
        !penis - Shows the logo
        !socialstats - Show social media stats
        """, inline=False)
        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Information(bot))
