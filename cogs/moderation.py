import discord
from discord.ext import commands

class Moderation(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='mod', hidden=True)
    @commands.has_permissions(administrator=True)
    async def mod_panel(self, ctx):
        """Moderation commands panel - Admin only"""
        embed = discord.Embed(
            title="Moderation Commands",
            color=discord.Color.blue()
        )
        embed.add_field(name="🛡️ Anti-Raid", value="!antiraid [on/off]", inline=False)
        embed.add_field(name="🔨 Ban", value="!ban @user [reason]", inline=False)
        embed.add_field(name="🧹 Clear", value="!clear [amount]", inline=False)
        embed.add_field(name="👢 Kick", value="!kick @user [reason]", inline=False)
        embed.add_field(name="🔒 Lock", value="!lock [channel]", inline=False)
        embed.add_field(name="📝 Modlog", value="!modlog [channel]", inline=False)
        embed.add_field(name="🔇 Mute", value="!mute @user [duration]", inline=False)
        embed.add_field(name="🔓 Unlock", value="!unlock [channel]", inline=False)
        embed.add_field(name="🔊 Unmute", value="!unmute @user", inline=False)
        embed.add_field(name="⚠️ Warn", value="!warn @user [reason]", inline=False)
        
        await ctx.send(embed=embed)
    @commands.command(hidden=True)
    @commands.has_permissions(ban_members=True)
    async def ban(self, ctx, member: discord.Member, *, reason=None):
        """Ban a member from the server"""
        await member.ban(reason=reason)
        await ctx.send(f'{member} has been banned.')

    @commands.command(hidden=True)
    @commands.has_permissions(kick_members=True)
    async def kick(self, ctx, member: discord.Member, *, reason=None):
        """Kick a member from the server"""
        await member.kick(reason=reason)
        await ctx.send(f'{member} has been kicked.')

    @commands.command(hidden=True)
    @commands.has_permissions(manage_messages=True)
    async def clear(self, ctx, amount: int):
        """Clear a specified number of messages"""
        await ctx.channel.purge(limit=amount + 1)
        msg = await ctx.send(f'Cleared {amount} messages!')
        await asyncio.sleep(3)
        await msg.delete()

    @commands.command(hidden=True)
    @commands.has_permissions(manage_roles=True)
    async def mute(self, ctx, member: discord.Member, *, reason=None):
        """Mute a member"""
        muted_role = discord.utils.get(ctx.guild.roles, name="Muted")
        if not muted_role:
            muted_role = await ctx.guild.create_role(name="Muted")
            for channel in ctx.guild.channels:
                await channel.set_permissions(muted_role, speak=False, send_messages=False)
        await member.add_roles(muted_role)
        await ctx.send(f'{member.mention} has been muted. Reason: {reason}')

    @commands.command(hidden=True)
    @commands.has_permissions(manage_roles=True)
    async def unmute(self, ctx, member: discord.Member):
        """Unmute a member"""
        muted_role = discord.utils.get(ctx.guild.roles, name="Muted")
        await member.remove_roles(muted_role)
        await ctx.send(f'{member.mention} has been unmuted.')

    @commands.command(hidden=True)
    @commands.has_permissions(administrator=True)
    async def warn(self, ctx, member: discord.Member, *, reason=None):
        """Warn a member"""
        await ctx.send(f'{member.mention} has been warned. Reason: {reason}')

    @commands.command(hidden=True)
    @commands.has_permissions(manage_channels=True)
    async def lock(self, ctx, channel: discord.TextChannel = None):
        """Lock a channel"""
        channel = channel or ctx.channel
        await channel.set_permissions(ctx.guild.default_role, send_messages=False)
        await ctx.send(f'🔒 {channel.mention} has been locked.')

    @commands.command(hidden=True)
    @commands.has_permissions(manage_channels=True)
    async def unlock(self, ctx, channel: discord.TextChannel = None):
        """Unlock a channel"""
        channel = channel or ctx.channel
        await channel.set_permissions(ctx.guild.default_role, send_messages=True)
        await ctx.send(f'🔓 {channel.mention} has been unlocked.')

    @commands.command(hidden=True)
    @commands.has_permissions(administrator=True)
    async def antiraid(self, ctx, mode: str):
        """Enable or disable anti-raid protection"""
        try:
            if mode.lower() == "on":
                await ctx.guild.edit(verification_level=discord.VerificationLevel.high)
                embed = discord.Embed(
                    title="🛡️ Anti-Raid Protection Enabled",
                    description="Server security level has been increased.",
                    color=0xFF0000
                )
                embed.add_field(name="Status", value="Active ✅", inline=True)
                embed.add_field(name="Verification Level", value="High", inline=True)
                await ctx.send(embed=embed)
            elif mode.lower() == "off":
                await ctx.guild.edit(verification_level=discord.VerificationLevel.low)
                embed = discord.Embed(
                    title="🛡️ Anti-Raid Protection Disabled",
                    description="Server security level has been decreased.",
                    color=0x00FF00
                )
                embed.add_field(name="Status", value="Inactive ❌", inline=True)
                embed.add_field(name="Verification Level", value="Low", inline=True)
                await ctx.send(embed=embed)
            else:
                await ctx.send("❌ Please use `!antiraid on` or `!antiraid off`")
        except Exception as e:
            await ctx.send(f"An error occurred: {str(e)}")

async def setup(bot):
    await bot.add_cog(Moderation(bot))
