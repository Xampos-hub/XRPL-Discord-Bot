import { Client } from 'xrpl';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

export class ValidatorHealthMonitor {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.intervalTime = 15 * 60 * 1000; // 15 minutes
        this.updateInterval = null;
        console.log(`ValidatorHealthMonitor initialized with channel ID: ${this.channelId}`);
        console.log(`Updates will occur every ${this.intervalTime / (60 * 1000)} minutes`);
    }

    async initialize() {
        try {
            // Load previous validator data if exists
            try {
                const data = await fs.readFile(this.dataPath, 'utf8');
                const parsed = JSON.parse(data);
                
                if (parsed && parsed.validators) {
                    for (const [key, value] of Object.entries(parsed.validators)) {
                        this.validators.set(key, value);
                    }
                }
                
                this.lastUpdate = parsed.lastUpdate || null;
                console.log(`Loaded ${this.validators.size} validators from storage`);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error loading validator data:', err);
                }
                // File doesn't exist yet, will be created on first save
            }
            
            // Connect to XRPL
            const client = new Client('wss://xrplcluster.com');
            
            // Add error handlers for all possible error events
            this.xrplClient.on('error', (error) => {
                console.log('XRPL client error:', error);
            });
            
            this.xrplClient.on('disconnected', (code) => {
                console.log('XRPL connection lost. Code:', code);
            });
            
            this.xrplClient.on('reconnect', (error) => {
                console.log('XRPL client reconnecting:', error);
            });
            
            // Add specific handler for noPermission error
            this.xrplClient.connection.on('noPermission', (error) => {
                console.log('XRPL client permission error:', error);
            });
            
            await this.xrplClient.connect();
            console.log('Connected to XRPL for validator monitoring');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize validator monitor:', error);
            return false;
        }
    }

    async startAutomatedUpdates() {
        console.log(`Starting validator automated updates for channel ID: ${this.channelId}`);
        
        // Send an initial update immediately
        try {
            await this.sendUpdate();
            console.log('Initial validator update sent');
        } catch (error) {
            console.error('Error sending initial validator update:', error);
        }
        
        // Clear any existing interval
        this.cleanup();
        
        // Set up the interval with additional logging
        this.updateInterval = setInterval(() => {
            const now = new Date();
            console.log(`Validator update interval triggered at ${now.toISOString()}`);
            this.sendUpdate().catch(err => {
                console.error('Error in validator update interval:', err);
            });
        }, this.intervalTime);
        
        // Note: We're removing the service registration from here since we're doing it manually in setupChannels.js
        
        console.log(`Validator Health Monitor scheduled to update every ${this.intervalTime / (60 * 1000)} minutes`);
        return `Validator Health Monitor started with ${this.intervalTime / (60 * 1000)} minute intervals`;
    }

    // Add a cleanup method
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Validator Health Monitor interval cleared');
        }
    }

    async stopAutomatedUpdates() {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        
        if (this.xrplClient && this.xrplClient.isConnected()) {
            await this.xrplClient.disconnect();
        }
        
        this.isRunning = false;
        console.log('Validator Health Monitor stopped');
    }

    async performUpdate() {
        try {
            const channel = this.discordClient.channels.cache.get(this.channelId);
            if (!channel) {
                console.error(`Channel ${this.channelId} not found for validator updates`);
                return;
            }

            // Try to get detailed validator data
            let validatorData;
            try {
                validatorData = await this.fetchValidatorData();
            } catch (error) {
                console.error('Could not fetch detailed validator data, using basic health check:', error);
                // Fall back to basic health check
                validatorData = await this.fetchBasicNetworkHealth();
            }
            
            // Check for status changes
            const statusChanges = this.detectStatusChanges(validatorData);
            
            // Update stored validator data
            this.updateValidatorData(validatorData);
            
            // Create and send the main status embed
            const mainEmbed = this.createMainStatusEmbed(validatorData);
            await channel.send({ embeds: [mainEmbed] });
            
            // If there are status changes, send an alert
            if (statusChanges.length > 0) {
                const alertEmbed = this.createAlertEmbed(statusChanges);
                await channel.send({ embeds: [alertEmbed] });
            }
            
            // Save updated data
            await this.saveData();
            
            this.lastUpdate = new Date();
            console.log(`Validator update completed at ${this.lastUpdate.toISOString()}`);
        } catch (error) {
            console.error('Error performing validator update:', error);
            
            // Try to reconnect if disconnected
            if (this.xrplClient && !this.xrplClient.isConnected()) {
                try {
                    await this.xrplClient.connect();
                    console.log('Reconnected to XRPL');
                } catch (reconnectError) {
                    console.error('Failed to reconnect to XRPL:', reconnectError);
                }
            }
        }
    }

    async fetchValidatorData() {
        try {
            // Use the public XRPL API endpoint
            const response = await fetch('https://s1.ripple.com:51234/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method: 'server_info',
                    params: [{}]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extract relevant information
            const serverInfo = data.result?.info || {};
            
            // Create a list of known validators
            const knownValidators = [
                { domain: 'ripple.com', validation_public_key: 'ED2677ABFFD1B33AC6FBC3062B71F1E8397C1505E1C42C64D11AD1B28FF73F4734' },
                { domain: 'xrpl-labs.com', validation_public_key: 'ED587EACEC41397D13F1D0D1F47DDE2D714F5A4B2F8B6F9C5DE4D9F22BE268A9B3' },
                { domain: 'alloy.ee', validation_public_key: 'ED9434F48B67B64D9BF539C14FE27D83517D8D2AC464A7C24F8ACF5A1CC5853513' },
                { domain: 'bitso.com', validation_public_key: 'ED901D5A1648A9CD9A904BF882F5C51DD8F8D08E5D1F61D9FDD5A6F989B7E0A472' },
                { domain: 'coil.com', validation_public_key: 'ED1A7C082846CFF6AADDDB7F9246F61859C7E9C1F29573F355591A5BCC3F8D5B2C' },
                { domain: 'gatehub.net', validation_public_key: 'ED45D1840EE724BE327ABE9146503D5848EFD5F38B6D5FEDE71E91D5C81BCD830E' },
                { domain: 'coinbase.com', validation_public_key: 'ED13D5A0F6B2C88C256142AD44855C5AECC9244B7D8E8E7359E3F7B4E0DEECB784' }
            ];
            
            return {
                validators: knownValidators,
                validatorCount: serverInfo.validators_count || knownValidators.length,
                serverInfo: {
                    validated_ledger: {
                        seq: serverInfo.validated_ledger?.seq || 'Unknown'
                    },
                    complete_ledgers: serverInfo.complete_ledgers || 'Unknown',
                    server_state: serverInfo.server_state || 'Unknown',
                    io_latency_ms: serverInfo.io_latency_ms || 'Unknown',
                    uptime: serverInfo.uptime || 'Unknown',
                    build_version: serverInfo.build_version || 'Unknown'
                },
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error fetching validator data:', error);
            
            // Return mock data on error to avoid empty displays
            return {
                validators: [
                    { domain: 'ripple.com', validation_public_key: 'ED2677ABFFD1B33AC6FBC3062B71F1E8397C1505E1C42C64D11AD1B28FF73F4734' },
                    { domain: 'xrpl-labs.com', validation_public_key: 'ED587EACEC41397D13F1D0D1F47DDE2D714F5A4B2F8B6F9C5DE4D9F22BE268A9B3' },
                    { domain: 'alloy.ee', validation_public_key: 'ED9434F48B67B64D9BF539C14FE27D83517D8D2AC464A7C24F8ACF5A1CC5853513' }
                ],
                validatorCount: 3,
                serverInfo: { 
                    validated_ledger: { seq: 'Unknown' },
                    server_state: 'Unknown',
                    complete_ledgers: 'Unknown'
                },
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    determineValidatorStatus(validator) {
        // Determine status based on agreement percentage and other factors
        const agreement = parseFloat(validator.agreement_percentage || '0');
        
        if (agreement >= 95) {
            return 'healthy';
        } else if (agreement >= 80) {
            return 'warning';
        } else {
            return 'problem';
        }
    }

    detectStatusChanges(currentData) {
        const changes = [];
        
        for (const validator of currentData.validators) {
            const pubkey = validator.pubkey;
            const previousData = this.validators.get(pubkey);
            
            if (previousData) {
                // Check if status changed
                if (previousData.status !== validator.status) {
                    changes.push({
                        pubkey: pubkey,
                        domain: validator.domain,
                        oldStatus: previousData.status,
                        newStatus: validator.status,
                        isUnl: validator.isUnl
                    });
                }
            } else {
                // New validator
                changes.push({
                    pubkey: pubkey,
                    domain: validator.domain,
                    oldStatus: 'new',
                    newStatus: validator.status,
                    isUnl: validator.isUnl
                });
            }
        }
        
        // Check for validators that went offline (not in current data)
        for (const [pubkey, previousData] of this.validators.entries()) {
            const stillExists = currentData.validators.some(v => v.pubkey === pubkey);
            
            if (!stillExists) {
                changes.push({
                    pubkey: pubkey,
                    domain: previousData.domain,
                    oldStatus: previousData.status,
                    newStatus: 'offline',
                    isUnl: previousData.isUnl
                });
            }
        }
        
        return changes;
    }

    updateValidatorData(currentData) {
        // Update stored validator data
        for (const validator of currentData.validators) {
            this.validators.set(validator.pubkey, validator);
        }
    }

    createMainStatusEmbed(data) {
        // Calculate overall health metrics
        const totalValidators = data.validators.length;
        const unlValidators = data.validators.filter(v => v.isUnl).length;
        const healthyValidators = data.validators.filter(v => v.status === 'healthy').length;
        const warningValidators = data.validators.filter(v => v.status === 'warning').length;
        const problemValidators = data.validators.filter(v => v.status === 'problem').length;
        
        // Calculate average agreement
        const totalAgreement = data.validators.reduce((sum, v) => sum + v.agreement, 0);
        const avgAgreement = totalValidators > 0 ? (totalAgreement / totalValidators).toFixed(2) : 'N/A';
        
        // Determine overall network health
        let overallHealth = 'Healthy';
        let healthColor = '#00FF00'; // Green
        
        if (healthyValidators < unlValidators * 0.8) {
            overallHealth = 'Critical';
            healthColor = '#FF0000'; // Red
        } else if (healthyValidators < unlValidators * 0.9) {
            overallHealth = 'Warning';
            healthColor = '#FFFF00'; // Yellow
        }
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle('🛡️ XRPL Validator Health Monitor')
            .setColor(healthColor)
            .setDescription(`Overall network health: **${overallHealth}**`)
            .addFields(
                { name: 'Network Status', value: `State: ${data.serverStatus.state}\nValidated Ledger: ${data.serverStatus.validatedLedger?.seq || 'Unknown'}`, inline: true },
                { name: 'Validator Metrics', value: `Total: ${totalValidators}\nUNL: ${unlValidators}\nHealthy: ${healthyValidators}\nWarning: ${warningValidators}\nProblem: ${problemValidators}`, inline: true },
                { name: 'Agreement', value: `Average: ${avgAgreement}%`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'XRPL Validator Health Monitor' });
        
        // Add top UNL validators
        const unlValidatorList = data.validators
            .filter(v => v.isUnl)
            .sort((a, b) => b.agreement - a.agreement)
            .slice(0, 5)
            .map(v => {
                const statusEmoji = v.status === 'healthy' ? '🟢' : v.status === 'warning' ? '🟡' : '🔴';
                return `${statusEmoji} ${v.domain} - ${v.agreement.toFixed(2)}% agreement`;
            })
            .join('\n');
        
        if (unlValidatorList) {
            embed.addFields({ name: 'Top UNL Validators', value: unlValidatorList });
        }
        
        return embed;
    }

    createAlertEmbed(changes) {
        // Create an embed for validator status changes
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Validator Status Changes Detected')
            .setColor('#FF9900')
            .setTimestamp()
            .setFooter({ text: 'XRPL Validator Health Monitor' });
        
        // Group changes by type
        const improved = changes.filter(c => 
            (c.oldStatus === 'problem' && (c.newStatus === 'warning' || c.newStatus === 'healthy')) ||
            (c.oldStatus === 'warning' && c.newStatus === 'healthy') ||
            (c.oldStatus === 'offline' && c.newStatus !== 'offline')
        );
        
        const degraded = changes.filter(c => 
            (c.oldStatus === 'healthy' && (c.newStatus === 'warning' || c.newStatus === 'problem')) ||
            (c.oldStatus === 'warning' && c.newStatus === 'problem') ||
            (c.newStatus === 'offline')
        );
        
        const newValidators = changes.filter(c => c.oldStatus === 'new');
        
        // Add fields for each type of change
        if (improved.length > 0) {
            const improvedList = improved.map(c => {
                const statusEmoji = c.newStatus === 'healthy' ? '🟢' : c.newStatus === 'warning' ? '🟡' : '🔴';
                return `${statusEmoji} ${c.domain || c.pubkey.substring(0, 8)} - ${c.oldStatus} → ${c.newStatus}${c.isUnl ? ' (UNL)' : ''}`;
            }).join('\n');
            
            embed.addFields({ name: '✅ Improved Validators', value: improvedList });
        }
        
        if (degraded.length > 0) {
            const degradedList = degraded.map(c => {
                const statusEmoji = c.newStatus === 'offline' ? '⚫' : c.newStatus === 'problem' ? '🔴' : '🟡';
                return `${statusEmoji} ${c.domain || c.pubkey.substring(0, 8)} - ${c.oldStatus} → ${c.newStatus}${c.isUnl ? ' (UNL)' : ''}`;
            }).join('\n');
            
            embed.addFields({ name: '❌ Degraded Validators', value: degradedList });
        }
        
        if (newValidators.length > 0) {
            const newList = newValidators.map(c => {
                const statusEmoji = c.newStatus === 'healthy' ? '🟢' : c.newStatus === 'warning' ? '🟡' : '🔴';
                return `${statusEmoji} ${c.domain || c.pubkey.substring(0, 8)} - ${c.newStatus}${c.isUnl ? ' (UNL)' : ''}`;
            }).join('\n');
            
            embed.addFields({ name: '🆕 New Validators', value: newList });
        }
        
        return embed;
    }

    async saveData() {
        try {
            // Convert Map to object for JSON serialization
            const validatorsObj = {};
            for (const [key, value] of this.validators.entries()) {
                validatorsObj[key] = value;
            }
            
            const dataToSave = {
                lastUpdate: this.lastUpdate,
                validators: validatorsObj
            };
            
            // Ensure directory exists
            const dir = path.dirname(this.dataPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Save data
            await fs.writeFile(this.dataPath, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('Error saving validator data:', error);
        }
    }

    async sendUpdate() {
        try {
            const channel = this.client.channels.cache.get(this.channelId);
            if (!channel) {
                console.error(`Channel with ID ${this.channelId} not found`);
                return;
            }

            // Instead of sending a test message, fetch actual validator data
            const validatorData = await this.fetchValidatorData();
            
            // Create an embed with the validator data
            const embed = this.createValidatorEmbed(validatorData);
            
            // Send the embed to the channel
            await channel.send({ embeds: [embed] });
            console.log(`Sent validator update to channel ${this.channelId}`);
        } catch (error) {
            console.error('Error sending validator update:', error);
        }
    }

    createValidatorEmbed(data) {
        const { validators, validatorCount, serverInfo, timestamp, error } = data;
        
        const embed = new EmbedBuilder()
            .setTitle('🛡️ XRPL Validator Health Monitor')
            .setColor('#00ff00')
            .setTimestamp(timestamp);
        
        if (error) {
            // Still show the data we have, but mention the error
            embed.setDescription(`⚠️ Note: Error fetching complete validator data: ${error}`)
                .setColor('#ffcc00');
        }
        
        // Add server info
        if (serverInfo) {
            let networkStatusText = '';
            
            if (serverInfo.validated_ledger && serverInfo.validated_ledger.seq !== 'Unknown') {
                networkStatusText += `• Validated Ledger: ${serverInfo.validated_ledger.seq}\n`;
            }
            
            if (serverInfo.server_state !== 'Unknown') {
                networkStatusText += `• Server State: ${serverInfo.server_state}\n`;
            }
            
            if (serverInfo.complete_ledgers !== 'Unknown') {
                networkStatusText += `• Complete Ledgers: ${serverInfo.complete_ledgers}\n`;
            }
            
            if (serverInfo.io_latency_ms !== 'Unknown') {
                networkStatusText += `• I/O Latency: ${serverInfo.io_latency_ms}ms\n`;
            }
            
            if (networkStatusText) {
                embed.addFields({ 
                    name: '📊 Network Status', 
                    value: networkStatusText || 'No network status available'
                });
            }
        }
        
        // Add validator info
        if (validators && validators.length > 0) {
            embed.addFields({ 
                name: '🔢 Validator Count', 
                value: `${validatorCount} validators in the network`
            });
            
            // List some validators (limit to 5)
            const validatorList = validators.slice(0, 5).map(v => {
                return `**${v.domain || 'Unknown Domain'}**\n` +
                       `• Public Key: ${v.validation_public_key.substring(0, 8)}...\n`;
            }).join('\n');
            
            embed.addFields({ 
                name: '🌐 Sample Validators', 
                value: validatorList || 'No validator details available'
            });
        } else {
            embed.addFields({ name: '🌐 Validators', value: 'No validators found' });
        }
        
        // Add health assessment
        const healthStatus = this.assessNetworkHealth(data);
        embed.addFields({ 
            name: '🩺 Network Health', 
            value: healthStatus.message
        });
        
        // Set color based on health
        embed.setColor(healthStatus.color);
        
        return embed;
    }

    assessNetworkHealth(data) {
        const { validatorCount, serverInfo, error } = data;
        
        if (error && !serverInfo.server_state) {
            return {
                status: 'ERROR',
                message: '⚠️ Unable to assess network health due to data fetch error',
                color: '#ff0000'
            };
        }
        
        // Check server state if available
        if (serverInfo.server_state) {
            if (serverInfo.server_state === 'full' || serverInfo.server_state === 'validating') {
                return {
                    status: 'HEALTHY',
                    message: '✅ Network is healthy and operating normally',
                    color: '#00ff00'
                };
            } else if (serverInfo.server_state === 'connected') {
                return {
                    status: 'GOOD',
                    message: '🟢 Network is connected and operational',
                    color: '#00cc00'
                };
            } else if (serverInfo.server_state === 'syncing') {
                return {
                    status: 'SYNCING',
                    message: '🟡 Network is syncing - monitoring advised',
                    color: '#ffcc00'
                };
            }
        }
        
        // Fall back to validator count assessment
        if (validatorCount >= 30) {
            return {
                status: 'HEALTHY',
                message: '✅ Network has strong validator participation',
                color: '#00ff00'
            };
        } else if (validatorCount >= 20) {
            return {
                status: 'GOOD',
                message: '🟢 Network has adequate validator participation',
                color: '#00cc00'
            };
        } else if (validatorCount >= 10) {
            return {
                status: 'CAUTION',
                message: '🟡 Network has reduced validator participation - monitoring advised',
                color: '#ffcc00'
            };
        } else {
            return {
                status: 'WARNING',
                message: '🔴 Network has low validator participation - potential concern',
                color: '#ff6600'
            };
        }
    }
}