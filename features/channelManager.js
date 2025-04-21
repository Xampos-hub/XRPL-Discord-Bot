import { ChannelType, PermissionFlagsBits } from 'discord.js';

export async function createInformationChannels(guild) {
    const category = await guild.channels.create({
        name: '📊 XRPL Market Data',
        type: ChannelType.GuildCategory,
    });

    const priceChannel = await guild.channels.create({
        name: '💰│xrp-price',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.SendMessages],
            }
        ]
    });

    const volumeChannel = await guild.channels.create({
        name: '📈│trading-volume',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.SendMessages],
            }
        ]
    });

    const whaleChannel = await guild.channels.create({
        name: '🐋│whale-alerts',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.SendMessages],
            }
        ]
    });
      const nftChannel = await guild.channels.create({
          name: '🎨│nft-activity',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
              {
                  id: guild.roles.everyone,
                  deny: [PermissionFlagsBits.SendMessages],
              }
          ]
      });

      const ammChannel = await guild.channels.create({
          name: '🏊│amm-analytics',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
              {
                  id: guild.roles.everyone,
                  deny: [PermissionFlagsBits.SendMessages],
              }
          ]
      });

      const newsChannel = await guild.channels.create({
          name: '📰│xrpl-news',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
              {
                  id: guild.roles.everyone,
                  deny: [PermissionFlagsBits.SendMessages],
              }
          ]
      });

      return {
          priceChannelId: priceChannel.id,
          volumeChannelId: volumeChannel.id,
          whaleChannelId: whaleChannel.id,
          nftChannelId: nftChannel.id,
          ammChannelId: ammChannel.id,
          newsChannelId: newsChannel.id,
          categoryId: category.id
      };
  }