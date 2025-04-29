import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import serviceManager from './serviceManager.js';
import fs from 'fs/promises';
import path from 'path';

export class DeveloperEcosystemPulse {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        // Change to a more reasonable interval for testing
        this.intervalTime = 30 * 60 * 1000; // 30 minutes (instead of 24 hours)
        this.updateInterval = null;
        
        // Key XRPL repositories to track
        this.repositories = [
            { owner: 'XRPLF', repo: 'xrpl.js' },
            { owner: 'XRPLF', repo: 'xrpl-py' },
            { owner: 'XRPLF', repo: 'xrpl4j' },
            { owner: 'ripple', repo: 'rippled' },
            { owner: 'XRPLF', repo: 'XRPL-Standards' }
        ];
        
        // Fix the RSS feeds
        this.rssFeeds = [
            'https://xrpl.org/blog.xml',
            'https://dev.to/feed/tag/xrpl'
        ];
        
        // Fix the GitHub API URL
        this.githubApiUrl = 'https://api.github.com/search/repositories?q=topic:xrpl&sort=stars&order=desc';
        
        console.log(`DeveloperEcosystemPulse initialized with channel ID: ${this.channelId}`);
        console.log(`Updates will occur every ${this.intervalTime / (60 * 1000)} minutes`);
    }

    async initialize() {
        try {
            // Load previous data if exists
            try {
                const data = await fs.readFile(this.dataPath, 'utf8');
                const parsed = JSON.parse(data);
                this.lastUpdate = parsed.lastUpdate || null;
                console.log('Loaded developer ecosystem data from storage');
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error loading developer ecosystem data:', err);
                }
                // File doesn't exist yet, will be created on first save
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize developer ecosystem pulse:', error);
            return false;
        }
    }

    async startAutomatedUpdates() {
        console.log(`Starting developer ecosystem updates for channel ID: ${this.channelId}`);
        
        // Send an initial update immediately
        try {
            await this.sendUpdate();
            console.log('Initial developer ecosystem update sent');
        } catch (error) {
            console.error('Error sending initial developer ecosystem update:', error);
        }
        
        // Clear any existing interval
        this.cleanup();
        
        // Set up the interval with additional logging
        this.updateInterval = setInterval(() => {
            const now = new Date();
            console.log(`Developer ecosystem update interval triggered at ${now.toISOString()}`);
            this.sendUpdate().catch(err => {
                console.error('Error in developer ecosystem update interval:', err);
            });
        }, this.intervalTime);
        
        // Note: We're removing the service registration from here since we're doing it manually in setupChannels.js
        
        console.log(`Developer Ecosystem Pulse scheduled to update every ${this.intervalTime / (60 * 1000)} minutes`);
        return `Developer Ecosystem Pulse started with ${this.intervalTime / (60 * 1000)} minute intervals`;
    }

    // Add a cleanup method
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Developer Ecosystem Pulse interval cleared');
        }
    }

    async stopAutomatedUpdates() {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        
        this.isRunning = false;
        console.log('Developer Ecosystem Pulse stopped');
    }

    async sendUpdate() {
        try {
            console.log(`Attempting to send developer ecosystem update to channel ID: ${this.channelId}`);
            const channel = this.client.channels.cache.get(this.channelId);
            
            if (!channel) {
                console.error(`Developer ecosystem channel not found for ID: ${this.channelId}`);
                return;
            }
            
            console.log(`Sending developer ecosystem update to channel: ${channel.name} (${this.channelId})`);
            
            // Create a simple test embed to verify channel posting works
            const testEmbed = new EmbedBuilder()
                .setTitle('Developer Ecosystem Pulse Test')
                .setDescription('This is a test message to verify the channel is working')
                .setColor('#00ff00')
                .setTimestamp();
            
            await channel.send({ embeds: [testEmbed] });
            console.log('Test developer ecosystem update sent successfully');
            
            // Create the main embed
            const embed = new EmbedBuilder()
                .setTitle('👨‍💻 XRPL Developer Ecosystem Pulse')
                .setColor('#0099ff')
                .setDescription('Latest updates from the XRPL developer ecosystem')
                .setTimestamp();
            
            // Add GitHub repositories field
            try {
                const githubData = await this.fetchGitHubData() || [];
            
                if (githubData && githubData.length > 0) {
                    embed.addFields({
                        name: '🔥 Trending XRPL Repositories',
                        value: githubData.slice(0, 5).map(repo => 
                            `[${repo.name}](${repo.html_url}) - ${repo.description || 'No description'} (⭐ ${repo.stargazers_count})`
                        ).join('\n')
                    });
                } else {
                    embed.addFields({
                        name: '🔥 Trending XRPL Repositories',
                        value: 'No trending repositories found'
                    });
                }
            } catch (error) {
                console.error('Error processing GitHub data:', error);
                embed.addFields({
                    name: '🔥 Trending XRPL Repositories',
                    value: 'Unable to fetch repository data'
                });
            }
            
            // Add RSS feed articles field
            try {
                const rssData = await this.fetchRSSFeeds() || [];
            
                if (rssData && rssData.length > 0) {
                    embed.addFields({
                        name: '📚 Latest XRPL Articles',
                        value: rssData.slice(0, 5).map(item => 
                            `[${item.title}](${item.link}) - ${new Date(item.pubDate).toLocaleDateString()}`
                        ).join('\n')
                    });
                } else {
                    embed.addFields({
                        name: '📚 Latest XRPL Articles',
                        value: 'No recent articles found'
                    });
                }
            } catch (error) {
                console.error('Error processing RSS data:', error);
                embed.addFields({
                    name: '📚 Latest XRPL Articles',
                    value: 'Unable to fetch article data'
                });
            }
            
            // Add resources field
            embed.addFields({
                name: '🔗 Developer Resources',
                value: '[XRPL.org Docs](https://xrpl.org/docs.html) | [Dev Portal](https://xrpl.org/dev-portal.html) | [GitHub](https://github.com/XRPLF)'
            });
            
            await channel.send({ embeds: [embed] });
            console.log('Developer ecosystem update sent successfully');
        } catch (error) {
            console.error('Error sending developer ecosystem update:', error);
        }
    }

    async fetchGitHubData() {
        try {
            console.log('Fetching GitHub data...');
            const response = await axios.get(this.githubApiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'XRPL-Discord-Bot'
                }
            });
            console.log('GitHub API response received');
            return response.data.items || [];
        } catch (error) {
            console.error('GitHub API error:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data));
            }
            return [];
        }
    }

    async fetchRSSFeeds() {
        const allItems = [];
        
        for (const feedUrl of this.rssFeeds) {
            try {
                console.log(`Fetching RSS feed: ${feedUrl}`);
                const response = await axios.get(feedUrl, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'XRPL-Discord-Bot/1.0'
                    }
                });
                
                if (response.status === 200) {
                    // Process the RSS feed
                    // Your existing code to parse the XML
                    console.log(`Successfully fetched RSS feed: ${feedUrl}`);
                    
                    // Add the items to allItems array
                    // ...
                }
            } catch (error) {
                console.error(`Error fetching RSS feed ${feedUrl}: ${error.message}`);
                // Continue with the next feed
            }
        }
        
        return allItems;
    }

    extractRssItems(xml) {
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>([\s\S]*?)<\/title>/;
        const linkRegex = /<link>([\s\S]*?)<\/link>/;
        const descRegex = /<description>([\s\S]*?)<\/description>/;
        const dateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
        
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
            const itemXml = match[1];
            
            const titleMatch = titleRegex.exec(itemXml);
            const linkMatch = linkRegex.exec(itemXml);
            const descMatch = descRegex.exec(itemXml);
            const dateMatch = dateRegex.exec(itemXml);
            
            if (titleMatch && linkMatch) {
                items.push({
                    title: this.decodeHtmlEntities(titleMatch[1]),
                    link: linkMatch[1],
                    description: descMatch ? this.decodeHtmlEntities(descMatch[1]) : '',
                    pubDate: dateMatch ? dateMatch[1] : ''
                });
            }
        }
        
        return items;
    }

    decodeHtmlEntities(text) {
        return text
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/&/g, '&')
            .replace(/"/g, '"')
            .replace(/'/g, "'");
    }

    createMainEmbed(githubData, rssData) {
        const embed = new EmbedBuilder()
            .setTitle('👨‍💻 XRPL Developer Ecosystem Pulse')
            .setColor('#00ff00')
            .setDescription('Latest updates from the XRPL developer ecosystem')
            .addFields(
                { 
                    name: '📊 GitHub Activity', 
                    value: `Commits: ${githubData.totalCommits}\nPull Requests: ${githubData.totalPRs}\nOpen Issues: ${githubData.totalIssues}\nNew Releases: ${githubData.totalReleases}`,
                    inline: true
                },
                {
                    name: '📚 Content Updates',
                    value: `New Articles: ${rssData.items.length}`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ text: 'XRPL Developer Ecosystem Pulse' });
        
        return embed;
    }

    createRepositoryEmbed(githubData) {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ XRPL Repository Updates')
            .setColor('#0099ff')
            .setTimestamp()
            .setFooter({ text: 'XRPL Developer Ecosystem Pulse' });
        
        // Add significant updates
        if (githubData.significantUpdates.length > 0) {
            const updatesText = githubData.significantUpdates
                .map(update => `**${update.title}**\n${update.description}\n[View on GitHub](${update.url})`)
                .join('\n\n');
            
            embed.addFields({ name: '🚀 New Releases', value: updatesText });
        }
        
        // Add most active repositories
        const activeRepos = githubData.repositories
            .sort((a, b) => b.commits.length - a.commits.length)
            .slice(0, 3);
        
        if (activeRepos.length > 0) {
            const reposText = activeRepos
                .map(repo => `**${repo.fullName}**\n${repo.commits.length} recent commits\n[View on GitHub](${repo.url})`)
                .join('\n\n');
            
            embed.addFields({ name: '⚡ Most Active Repositories', value: reposText });
        }
        
        return embed;
    }

    createContentEmbed(rssData) {
        const embed = new EmbedBuilder()
            .setTitle('📝 XRPL Developer Content')
            .setColor('#ff9900')
            .setTimestamp()
            .setFooter({ text: 'XRPL Developer Ecosystem Pulse' });
        
        // Add recent articles
        if (rssData.items.length > 0) {
            const articlesText = rssData.items
                .slice(0, 5) // Show up to 5 most recent articles
                .map(item => `**${item.title}**\nSource: ${item.source}\n[Read Article](${item.link})`)
                .join('\n\n');
            
            embed.addFields({ name: '📚 Recent Articles & Tutorials', value: articlesText });
        }
        
        return embed;
    }

    async saveData(data) {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dataPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Save data
            await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving developer ecosystem data:', error);
        }
    }
}