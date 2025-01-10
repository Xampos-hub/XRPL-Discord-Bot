import { EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

export async function handleNFTHoldings(interaction) {
    const nftAddress = interaction.fields.getTextInputValue('nft_address_input');
    try {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        const response = await client.request({
            command: "account_nfts",
            account: nftAddress
        });

        const nftEmbed = new EmbedBuilder()
            .setColor('#ff00ff')
            .setTitle('🎨 NFT Collection')
            .setDescription(`NFTs owned by ${nftAddress.substring(0, 12)}...`);

        if (response.result.account_nfts.length === 0) {
            nftEmbed.addFields({
                name: '\u200B',
                value: '❌ No NFTs found in this wallet'
            });
        } else {
            response.result.account_nfts.forEach((nft, index) => {
                let details = '';
                details += `🆔 TokenID: ${nft.TokenID.substring(0, 16)}...\n`;
                details += `📦 Serial: ${nft.nft_serial}\n`;
                if (nft.URI) {
                    const decodedUri = Buffer.from(nft.URI, 'hex').toString();
                    details += `🔗 URI: ${decodedUri.substring(0, 30)}...`;
                }

                nftEmbed.addFields({
                    name: `NFT ${index + 1}`,
                    value: `\`\`\`${details}\`\`\``
                });
            });
        }

        await interaction.reply({ embeds: [nftEmbed], ephemeral: true });
        await client.disconnect();
    } catch (error) {
        await interaction.reply({ 
            content: 'Error fetching NFT data: Invalid address or network error', 
            ephemeral: true 
        });
    }
}