import discord
from discord.ext import commands

class Events(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_join(self, member):
        default_role = discord.utils.get(member.guild.roles, name="Member")
        if not default_role:
            default_role = await member.guild.create_role(name="Member", color=discord.Color.blue())
            
        community_role = discord.utils.get(member.guild.roles, name="Community")
        if not community_role:
            community_role = await member.guild.create_role(name="Community", color=discord.Color.green())

        await member.add_roles(default_role)
        await member.add_roles(community_role)
        
        welcome_channel = self.bot.get_channel(1298295865475338271)
        if welcome_channel:
            embed = discord.Embed(title="Welcome to Happy Penis Token! 🚀", 
                                description=f"Welcome {member.mention}! You've been given the Member and Community roles.",
                                color=0xFF69B4)
            await welcome_channel.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Events(bot))
