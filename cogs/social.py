import discord
from discord.ext import commands
import tweepy
import aiohttp

class Social(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def get_twitter_followers(self):
        auth = tweepy.OAuthHandler(self.bot.TWITTER_API_KEY, self.bot.TWITTER_API_SECRET)
        auth.set_access_token(self.bot.TWITTER_ACCESS_TOKEN, self.bot.TWITTER_ACCESS_SECRET)
        api = tweepy.API(auth)
        user = api.get_user(screen_name="your_twitter_handle")
        return user.followers_count

    async def get_telegram_members(self):
        async with aiohttp.ClientSession() as session:
            url = f"https://api.telegram.org/bot{self.bot.TELEGRAM_BOT_TOKEN}/getChatMembersCount?chat_id={self.bot.TELEGRAM_CHAT_ID}"
            async with session.get(url) as response:
                data = await response.json()
                return data['result']

    @commands.command()
    async def socialstats(self, ctx):
        try:
            twitter_followers = await self.get_twitter_followers()
            discord_members = len(ctx.guild.members)
            telegram_members = await self.get_telegram_members()
            
            embed = discord.Embed(title="HP Token Social Media Stats", color=0xFF69B4)
            embed.add_field(name="Twitter Followers", value=f"{twitter_followers:,}", inline=True)
            embed.add_field(name="Discord Members", value=f"{discord_members:,}", inline=True)
            embed.add_field(name="Telegram Members", value=f"{telegram_members:,}", inline=True)
            
            await ctx.send(embed=embed)
        except Exception as e:
            await ctx.send(f"Error fetching social stats: {e}")

async def setup(bot):
    await bot.add_cog(Social(bot))
