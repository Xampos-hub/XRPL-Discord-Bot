// Global service manager to prevent garbage collection and ensure services keep running

class ServiceManager {
    constructor() {
        this.services = new Map();
        this.initialized = false;
        this.checkInterval = null;
        console.log('Service Manager initialized');
    }

    registerService(name, instance) {
        console.log(`Registering service: ${name}`);
        console.log(`Service instance type: ${typeof instance}`);
        console.log(`Service instance properties: ${Object.keys(instance).join(', ')}`);
        
        // Clean up existing service if it exists
        if (this.services.has(name)) {
            const existingService = this.services.get(name);
            if (existingService && typeof existingService.cleanup === 'function') {
                console.log(`Cleaning up existing service: ${name}`);
                existingService.cleanup();
            }
        }
        
        // Register the new service
        this.services.set(name, instance);
        console.log(`Service registered: ${name}, total services: ${this.services.size}`);
        
        return instance;
    }

    getService(name) {
        const service = this.services.get(name);
        console.log(`Getting service: ${name}, found: ${service ? 'Yes' : 'No'}`);
        return service;
    }

    getAllServices() {
        console.log(`Getting all services, count: ${this.services.size}`);
        return Array.from(this.services.entries());
    }

    // Debug method to check if services are still running
    checkServices() {
        console.log(`Checking ${this.services.size} registered services:`);
        this.services.forEach((service, name) => {
            console.log(`- ${name}: ${service.updateInterval ? 'Running' : 'Not running'}`);
        });
    }

    // Add a method to start the check interval
    startChecking() {
        if (this.checkInterval) return;
        
        this.checkInterval = setInterval(() => {
            this.checkServices();
        }, 10 * 60 * 1000);
        console.log('Service checking interval started');
    }
}

// Create a singleton instance
const serviceManager = new ServiceManager();

// Don't start the interval here
// Only start it in your bot's ready event

export default serviceManager;