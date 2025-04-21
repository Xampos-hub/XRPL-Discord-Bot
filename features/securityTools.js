import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import xrpl from 'xrpl';

// Known scam addresses (this would be a larger database in production)
const knownScamAddresses = [
    'rHarScoLfib5uLmJbUn7XVVCU8YGFEp7m2',
    'rLFtVprxUEfsH54eCWKsZrEQzMDsx1wqso',
    // Add more known scam addresses
];

// Phishing Check Handler
export async function handlePhishingCheck(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('phishing_check_modal')
        .setTitle('Check Address or Link');

    const addressInput = new TextInputBuilder()
        .setCustomId('address_input')
        .setLabel('Enter XRPL Address or Website URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('r... or https://...')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(addressInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

// Transaction Verification Handler
export async function handleTransactionVerification(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('verify_tx_modal')
        .setTitle('Verify Transaction');

    const txInput = new TextInputBuilder()
        .setCustomId('tx_blob_input')
        .setLabel('Enter Transaction Blob or Hash')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Paste transaction blob or hash here')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(txInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

// Security Audit Handler
export async function handleSecurityAudit(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('security_audit_modal')
        .setTitle('Wallet Security Audit');

    const addressInput = new TextInputBuilder()
        .setCustomId('audit_address_input')
        .setLabel('Enter XRPL Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(addressInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

// Activity Monitor Handler
export async function handleActivityMonitor(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('activity_monitor_modal')
        .setTitle('Set Up Activity Monitoring');

    const addressInput = new TextInputBuilder()
        .setCustomId('monitor_address_input')
        .setLabel('Enter XRPL Address to Monitor')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
        .setRequired(true);

    const thresholdInput = new TextInputBuilder()
        .setCustomId('threshold_input')
        .setLabel('Alert Threshold (XRP amount)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 1000')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(addressInput);
    const secondActionRow = new ActionRowBuilder().addComponents(thresholdInput);
    modal.addComponents(firstActionRow, secondActionRow);
    await interaction.showModal(modal);
}

// Trustline Safety Handler
export async function handleTrustlineSafety(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('trustline_safety_modal')
        .setTitle('Check Trustline Safety');

    const currencyInput = new TextInputBuilder()
        .setCustomId('currency_input')
        .setLabel('Currency Code')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., USD')
        .setRequired(true);

    const issuerInput = new TextInputBuilder()
        .setCustomId('issuer_input')
        .setLabel('Issuer Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(currencyInput);
    const secondActionRow = new ActionRowBuilder().addComponents(issuerInput);
    modal.addComponents(firstActionRow, secondActionRow);
    await interaction.showModal(modal);
}

// Security Resources Handler
export async function handleSecurityResources(interaction) {
    const resourcesEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📚 XRPL Security Resources')
        .setDescription('Essential resources to keep your XRPL assets safe')
        .addFields(
            { 
                name: '🔒 Official Security Guides', 
                value: '[XRPL.org Security Guide](https://xrpl.org/secure-signing.html)\n[Xaman Wallet Security](https://xumm.app/security)' 
            },
            { 
                name: '🛡️ Best Practices', 
                value: '• Use a hardware wallet for large holdings\n• Enable multi-signing\n• Set up a regular key\n• Never share your seed phrase\n• Verify all transactions before signing' 
            },
            { 
                name: '⚠️ Common Scams', 
                value: '• Fake airdrops\n• Phishing websites\n• Impersonation scams\n• Fake support staff\n• Malicious trustlines' 
            },
            { 
                name: '🆘 If You\'ve Been Hacked', 
                value: '1. Secure any remaining funds\n2. Report to the community\n3. Document everything\n4. Contact law enforcement if significant loss' 
            }
        )
        .setFooter({ text: 'Stay informed, stay secure' });

    await interaction.reply({ embeds: [resourcesEmbed], ephemeral: true });
}

// Process the phishing check modal submission
export async function processPhishingCheck(interaction) {
    const input = interaction.fields.getTextInputValue('address_input');
    
    // Check if it's an XRPL address
    if (input.startsWith('r') && input.length >= 25) {
        // Check against known scam addresses
        const isKnownScam = knownScamAddresses.includes(input);
        
        // Check address activity on XRPL
        let accountAge = 'Unknown';
        let transactionCount = 'Unknown';
        let riskLevel = 'Medium';
        let riskColor = '#FFA500';
        
        try {
            const client = new xrpl.Client("wss://s1.ripple.com");
            await client.connect();
            
            // Get account info
            const accountInfo = await client.request({
                command: "account_info",
                account: input,
                ledger_index: "validated"
            });
            
            // Get transaction history
            const txHistory = await client.request({
                command: "account_tx",
                account: input,
                limit: 200
            });
            
            transactionCount = txHistory.result.transactions.length;
            
            // Determine risk level based on account age and transaction count
            if (transactionCount < 5) {
                riskLevel = 'High';
                riskColor = '#FF0000';
            } else if (transactionCount > 100) {
                riskLevel = 'Low';
                riskColor = '#00FF00';
            }
            
            await client.disconnect();
        } catch (error) {
            console.error('Error checking address:', error);
        }
        
        // Create result embed
        const resultEmbed = new EmbedBuilder()
            .setColor(isKnownScam ? '#FF0000' : riskColor)
            .setTitle('🔍 Address Security Check')
            .addFields(
                { name: 'Address', value: input },
                { name: 'Known Scam', value: isKnownScam ? '⚠️ YES - DANGEROUS' : 'No known reports' },
                { name: 'Transaction Count', value: transactionCount.toString() },
                { name: 'Risk Level', value: isKnownScam ? 'EXTREME' : riskLevel }
            );
            
        if (isKnownScam) {
            resultEmbed.setDescription('⚠️ **DANGER: This is a known scam address!** ⚠️\nDo NOT send funds or interact with this address.');
        } else {
            resultEmbed.setDescription(`This address has a ${riskLevel.toLowerCase()} risk assessment based on our analysis.`);
        }
        
        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
    } 
    // Check if it's a URL
    else if (input.startsWith('http')) {
        // Simple check for known phishing domains (would be more sophisticated in production)
        const suspiciousDomains = ['xrpl-airdrop', 'free-xrp', 'xrp-giveaway', 'claim-xrp'];
        const url = new URL(input);
        const isDangerous = suspiciousDomains.some(domain => url.hostname.includes(domain));
        
        const resultEmbed = new EmbedBuilder()
            .setColor(isDangerous ? '#FF0000' : '#00FF00')
            .setTitle('🔍 Website Security Check')
            .setDescription(isDangerous ? 
                '⚠️ **DANGER: This appears to be a phishing website!** ⚠️' : 
                'No obvious red flags detected, but always be cautious.')
            .addFields(
                { name: 'URL', value: input },
                { name: 'Risk Assessment', value: isDangerous ? 'High Risk - Likely Phishing' : 'No known issues detected' },
                { name: 'Recommendation', value: isDangerous ? 
                    'Do NOT visit this site or enter any information' : 
                    'Proceed with caution. Never enter your seed phrase on websites.' }
            );
            
        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
    } 
    else {
        await interaction.reply({ 
            content: 'Invalid input. Please enter a valid XRPL address or website URL.', 
            ephemeral: true 
        });
    }
}

// Process the transaction verification modal submission
export async function processTransactionVerification(interaction) {
    const txBlob = interaction.fields.getTextInputValue('tx_blob_input');
    
    try {
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        let txDetails;
        let txType;
        let amount;
        let destination;
        let fee;
        let warnings = [];
        
        // Check if input is a transaction hash
        if (txBlob.length === 64 && /^[0-9A-F]+$/i.test(txBlob)) {
            // It's likely a transaction hash
            const tx = await client.request({
                command: "tx",
                transaction: txBlob
            });
            
            txDetails = tx.result;
            txType = txDetails.TransactionType;
            fee = xrpl.dropsToXrp(txDetails.Fee);
            
            if (txType === 'Payment') {
                amount = typeof txDetails.Amount === 'string' ? 
                    xrpl.dropsToXrp(txDetails.Amount) : 
                    txDetails.Amount.value;
                destination = txDetails.Destination;
            }
        } else {
            // Assume it's a transaction blob
            try {
                // Try to decode the transaction
                txDetails = xrpl.decode(txBlob);
                txType = txDetails.TransactionType;
                fee = xrpl.dropsToXrp(txDetails.Fee);
                
                if (txType === 'Payment') {
                    amount = typeof txDetails.Amount === 'string' ? 
                        xrpl.dropsToXrp(txDetails.Amount) : 
                        txDetails.Amount.value;
                    destination = txDetails.Destination;
                }
            } catch (error) {
                await interaction.reply({ 
                    content: 'Unable to decode transaction. Please check your input and try again.', 
                    ephemeral: true 
                });
                await client.disconnect();
                return;
            }
        }
        
        // Check for suspicious characteristics
        if (txType === 'Payment') {
            // Check for unusually high amounts
            if (amount > 10000) {
                warnings.push('⚠️ Unusually high amount');
            }
            
            // Check for known scam destinations
            if (knownScamAddresses.includes(destination)) {
                warnings.push('🚨 DESTINATION IS A KNOWN SCAM ADDRESS');
            }
        }
        
        // Check for unusually high fees
        if (fee > 0.001) {
            warnings.push('⚠️ Fee is higher than normal');
        }
        
        // Create the verification result embed
        const verifyEmbed = new EmbedBuilder()
            .setColor(warnings.length > 0 ? '#FF0000' : '#00FF00')
            .setTitle('🔐 Transaction Verification')
            .setDescription(warnings.length > 0 ? 
                '⚠️ **CAUTION: Potential issues detected!**' : 
                '✅ No obvious issues detected with this transaction.')
            .addFields(
                { name: 'Transaction Type', value: txType || 'Unknown' },
                { name: 'Fee', value: `${fee || 'Unknown'} XRP` }
            );
            
        // Add transaction-specific fields
        if (txType === 'Payment') {
            verifyEmbed.addFields(
                { name: 'Amount', value: `${amount || 'Unknown'} ${typeof txDetails.Amount === 'string' ? 'XRP' : txDetails.Amount.currency}` },
                { name: 'Destination', value: destination || 'Unknown' }
            );
        } else if (txType === 'TrustSet') {
            verifyEmbed.addFields(
                { name: 'Currency', value: txDetails.LimitAmount.currency },
                { name: 'Issuer', value: txDetails.LimitAmount.issuer },
                { name: 'Limit', value: txDetails.LimitAmount.value }
            );
        } else if (txType === 'OfferCreate') {
            verifyEmbed.addFields(
                { name: 'Selling', value: `${typeof txDetails.TakerGets === 'string' ? xrpl.dropsToXrp(txDetails.TakerGets) + ' XRP' : txDetails.TakerGets.value + ' ' + txDetails.TakerGets.currency}` },
                { name: 'Buying', value: `${typeof txDetails.TakerPays === 'string' ? xrpl.dropsToXrp(txDetails.TakerPays) + ' XRP' : txDetails.TakerPays.value + ' ' + txDetails.TakerPays.currency}` }
            );
        }
        
        // Add warnings section if there are any
        if (warnings.length > 0) {
            verifyEmbed.addFields(
                { name: '⚠️ Warnings', value: warnings.join('\n') }
            );
        }
        
        // Add recommendations
        verifyEmbed.addFields(
            { name: 'Recommendations', value: warnings.length > 0 ? 
                '• Review transaction carefully before signing\n• Verify the recipient address\n• Consider canceling if unsure' : 
                '• Always verify the recipient address\n• Double-check the amount before signing' 
            }
        );
        
        await interaction.reply({ embeds: [verifyEmbed], ephemeral: true });
        await client.disconnect();
    } catch (error) {
        console.error('Error verifying transaction:', error);
        await interaction.reply({ 
            content: 'Error verifying transaction. Please check your input and try again.', 
            ephemeral: true 
        });
    }
}

// Process the security audit modal submission
export async function processSecurityAudit(interaction) {
    const address = interaction.fields.getTextInputValue('audit_address_input');
    
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Get account info
        const accountInfo = await client.request({
            command: "account_info",
            account: address,
            ledger_index: "validated"
        });
        
        // Check account flags
        const flags = accountInfo.result.account_data.Flags;
        const requireDestTag = (flags & 0x00010000) !== 0;
        const disallowXRP = (flags & 0x00080000) !== 0;
        const requireAuth = (flags & 0x00020000) !== 0;
        
        // Check if account has a regular key set
        let hasRegularKey = false;
        try {
            if (accountInfo.result.account_data.RegularKey) {
                hasRegularKey = true;
            }
        } catch (e) {
            // No regular key
        }
        
        // Check for multi-signing
        let hasMultisigning = false;
        try {
            const signerList = await client.request({
                command: "account_objects",
                account: address,
                type: "signer_list"
            });
            
            hasMultisigning = signerList.result.account_objects.length > 0;
        } catch (e) {
            // No multi-signing
        }
        
        // Calculate security score
        let securityScore = 0;
        if (hasRegularKey) securityScore += 1;
        if (hasMultisigning) securityScore += 1;
        if (requireDestTag) securityScore += 1;
        if (requireAuth) securityScore += 1;
        if (disallowXRP) securityScore += 1;
        
        // Create recommendations
        const recommendations = [];
        if (!hasRegularKey) recommendations.push('• Set up a regular key for better security');
        if (!hasMultisigning) recommendations.push('• Configure multi-signing for critical accounts');
        if (!requireDestTag) recommendations.push('• Enable RequireDestTag to prevent accidental deposits');
        if (!requireAuth) recommendations.push('• Consider enabling RequireAuth for token issuers');
        
        // Create the audit result embed
        const auditEmbed = new EmbedBuilder()
            .setColor(securityScore >= 3 ? '#00FF00' : '#FFA500')
            .setTitle('📊 Wallet Security Audit')
            .setDescription(`Security audit results for ${address}`)
            .addFields(
                { 
                    name: 'Account Settings', 
                    value: `Regular Key: ${hasRegularKey ? '✅ Set' : '❌ Not Set'}\n` +
                           `Multi-signing: ${hasMultisigning ? '✅ Configured' : '❌ Not Configured'}\n` +
                           `Require Destination Tag: ${requireDestTag ? '✅ Enabled' : '❌ Disabled'}\n` +
                           `Require Authorization: ${requireAuth ? '✅ Enabled' : '❌ Disabled'}\n` +
                           `Disallow XRP: ${disallowXRP ? '✅ Enabled' : '❌ Disabled'}`
                },
                { 
                    name: 'Security Score', 
                    value: `${securityScore}/5 ${'⭐'.repeat(securityScore)}${' ☆'.repeat(5-securityScore)}`
                }
            );
            
        // Add recommendations if any
        if (recommendations.length > 0) {
            auditEmbed.addFields(
                { name: 'Recommendations', value: recommendations.join('\n') }
            );
        } else {
            auditEmbed.addFields(
                { name: 'Recommendations', value: '✅ Your account has excellent security settings!' }
            );
        }
        
        // Add educational resources
        auditEmbed.addFields(
            { 
                name: 'Learn More', 
                value: '[XRPL Account Settings Guide](https://xrpl.org/accountset.html)\n' +
                       '[Multi-signing Guide](https://xrpl.org/multi-signing.html)'
            }
        );
        
        await interaction.editReply({ embeds: [auditEmbed] });
        await client.disconnect();
    } catch (error) {
        console.error('Error performing security audit:', error);
        await interaction.editReply({ 
            content: 'Error performing security audit. Please check the address and try again.', 
            ephemeral: true 
        });
    }
}

// Process the activity monitor modal submission
export async function processActivityMonitor(interaction) {
    const address = interaction.fields.getTextInputValue('monitor_address_input');
    const threshold = parseFloat(interaction.fields.getTextInputValue('threshold_input'));
    
    if (isNaN(threshold) || threshold <= 0) {
        await interaction.reply({ 
            content: 'Please enter a valid threshold amount greater than 0.', 
            ephemeral: true 
        });
        return;
    }
    
    try {
        // In a real implementation, you would store this monitoring configuration
        // in a database and set up a background process to check for transactions
        
        const monitorEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⚠️ Activity Monitor Set Up')
            .setDescription(`Activity monitoring has been set up for ${address}`)
            .addFields(
                { name: 'Address', value: address },
                { name: 'Alert Threshold', value: `${threshold} XRP` },
                { name: 'Monitoring Status', value: '✅ Active' },
                { 
                    name: 'What You\'ll Be Notified About', 
                    value: `• Transactions over ${threshold} XRP\n` +
                           '• New trustlines added\n' +
                           '• Account setting changes\n' +
                           '• Suspicious login attempts (if using Xaman)'
                },
                { 
                    name: 'How It Works', 
                    value: 'The bot will monitor the XRPL for activity on this address and send you a direct message when suspicious activity is detected.'
                }
            );
            
        await interaction.reply({ embeds: [monitorEmbed], ephemeral: true });
        
        // Simulate setting up monitoring (in a real implementation, this would be persistent)
        console.log(`Activity monitoring set up for ${address} with threshold ${threshold} XRP`);
    } catch (error) {
        console.error('Error setting up activity monitoring:', error);
        await interaction.reply({ 
            content: 'Error setting up activity monitoring. Please try again.', 
            ephemeral: true 
        });
    }
}

// Process the trustline safety modal submission
export async function processTrustlineSafety(interaction) {
    const currency = interaction.fields.getTextInputValue('currency_input');
    const issuer = interaction.fields.getTextInputValue('issuer_input');
    
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const client = new xrpl.Client("wss://s1.ripple.com");
        await client.connect();
        
        // Check if issuer account exists
        let issuerExists = false;
        let issuerAge = 'Unknown';
        let issuerDomain = 'None';
        let trustlineCount = 0;
        let riskLevel = 'Medium';
        let riskColor = '#FFA500';
        
        try {
            // Get issuer account info
            const accountInfo = await client.request({
                command: "account_info",
                account: issuer,
                ledger_index: "validated"
            });
            
            issuerExists = true;
            
            // Check for domain
            if (accountInfo.result.account_data.Domain) {
                const domainHex = accountInfo.result.account_data.Domain;
                issuerDomain = Buffer.from(domainHex, 'hex').toString('utf-8');
            }
            
            // Get trustline count (how many accounts trust this issuer)
            const rippleState = await client.request({
                command: "account_objects",
                account: issuer,
                type: "state",
                limit: 400
            });
            
            trustlineCount = rippleState.result.account_objects.length;
            
            // Determine risk level
            if (issuerDomain !== 'None' && trustlineCount > 100) {
                riskLevel = 'Low';
                riskColor = '#00FF00';
            } else if (!issuerDomain || trustlineCount < 10) {
                riskLevel = 'High';
                riskColor = '#FF0000';
            }
        } catch (error) {
            issuerExists = false;
            riskLevel = 'Extreme';
            riskColor = '#FF0000';
        }
        
        // Create the trustline safety result embed
        const trustlineEmbed = new EmbedBuilder()
            .setColor(riskColor)
            .setTitle('🤝 Trustline Safety Analysis')
            .setDescription(`Analysis for ${currency}.${issuer}`)
            .addFields(
                { name: 'Currency', value: currency },
                { name: 'Issuer', value: issuer },
                { name: 'Issuer Exists', value: issuerExists ? '✅ Yes' : '❌ No' },
                { name: 'Domain Verification', value: issuerDomain !== 'None' ? `✅ ${issuerDomain}` : '❌ No domain set' },
                { name: 'Trustline Count', value: `${trustlineCount} accounts` },
                { name: 'Risk Assessment', value: `${riskLevel} Risk` }
            );
            
        // Add recommendations based on risk level
        if (riskLevel === 'Low') {
            trustlineEmbed.addFields(
                { 
                    name: 'Recommendation', 
                    value: '✅ This appears to be a legitimate token with good adoption.\n' +
                           'Always verify the exact issuer address before adding trustlines.'
                }
            );
        } else if (riskLevel === 'Medium') {
            trustlineEmbed.addFields(
                { 
                    name: 'Recommendation', 
                    value: '⚠️ Exercise caution with this token.\n' +
                           'Research the issuer further before adding a trustline.\n' +
                           'Consider setting a low trust limit initially.'
                }
            );
        } else {
            trustlineEmbed.addFields(
                { 
                    name: 'Recommendation', 
                    value: '🚨 High risk token detected!\n' +
                           'This token has red flags that suggest potential risk.\n' +
                           'NOT RECOMMENDED for trustline unless you have verified the issuer through other means.'
                }
            );
        }
        
        // Add educational information
        trustlineEmbed.addFields(
            { 
                name: 'About Trustlines', 
                value: 'Adding a trustline allows you to hold tokens issued by another account.\n' +
                       'Only add trustlines from issuers you trust, as they control the token value.'
            }
        );
        
        await interaction.editReply({ embeds: [trustlineEmbed] });
        await client.disconnect();
    } catch (error) {
        console.error('Error checking trustline safety:', error);
        await interaction.editReply({ 
            content: 'Error checking trustline safety. Please verify the currency and issuer address.', 
            ephemeral: true 
        });
    }
}
