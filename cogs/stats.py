import discord
from discord.ext import commands
from discord.ext import tasks

class Stats(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.combined_updates.start()

    @tasks.loop(minutes=45)
    async def combined_updates(self):
        try:
            channel = self.bot.get_channel(1298913973357510699)
            embed = discord.Embed(title="Happy Penis Coin Info & Stats", color=0xFF69B4)
            
            discord_members = len(self.bot.guilds[0].members)
            
            embed.add_field(name="Network", value="Solana", inline=True)
            embed.add_field(name="Contract", value="GgzjNE5YJ8FQ4r1Ts4vfUUq87ppv5qEZQ9uumVM7t", inline=True)
            embed.add_field(name="Website", value="https://happypenis.meme/", inline=True)
            embed.add_field(name="Price", value="$X.XX | 24h Change: +X%", inline=True)
            embed.add_field(name="Market Cap", value="$XXX,XXX", inline=True)
            embed.add_field(name="24h Volume", value="$XXX,XXX", inline=True)
            embed.add_field(name="Holders", value="X,XXX | New Today: XX", inline=True)
            embed.add_field(name="Liquidity", value="$XXX,XXX", inline=True)
            embed.add_field(name="Chart", value="SOON UPDATED", inline=True)
            embed.add_field(name="Social Media", value=f"Discord Members: {discord_members:,}", inline=True)
            
            await channel.send(embed=embed)
        except Exception as e:
            print(f"Error in combined_updates: {e}")

    @commands.command()
    @commands.has_permissions(administrator=True)
    async def autoupdates(self, ctx, mode: str):
        if mode.lower() == "on":
            self.combined_updates.start()
            embed = discord.Embed(title="Auto Updates Enabled", color=0x00FF00)
            embed.add_field(name="Status", value="✅ All auto updates are now active", inline=False)
            await ctx.send(embed=embed)
        elif mode.lower() == "off":
            self.combined_updates.cancel()
            embed = discord.Embed(title="Auto Updates Disabled", color=0xFF0000)
            embed.add_field(name="Status", value="❌ All auto updates are now paused", inline=False)
            await ctx.send(embed=embed)
        else:
                    await ctx.send("❌ Please use `!autoupdates on` or `!autoupdates off`")

        def cog_unload(self):
                self.combined_updates.cancel()

async def setup(bot):
            await bot.add_cog(Stats(bot))