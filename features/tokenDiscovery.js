import xrpl from 'xrpl';

// Cache for popular tokens to avoid repeated API calls
let popularTokensCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to decode hex currency codes
function decodeCurrencyCode(code) {
  if (!code || code === 'XRP' || code.length < 40) {
    return code;
  }
  
  try {
    // Remove non-hex characters
    const hex = code.replace(/[^0-9A-Fa-f]/g, '');
    
    // Convert hex to bytes
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    
    // Convert bytes to string and remove null characters
    const decoded = String.fromCharCode(...bytes).replace(/\0/g, '').trim();
    
    // If the decoded string is empty or only contains special characters, return the original code
    if (!decoded || !/[a-zA-Z0-9]/.test(decoded)) {
      return code;
    }
    
    return decoded;
  } catch (e) {
    console.error('Error decoding currency code:', e);
    return code;
  }
}

// Get a friendly name for an issuer
function getIssuerName(issuer) {
  const issuerNames = {
    "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B": "Bitstamp",
    "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq": "GateHub",
    "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz": "Sologenic",
    "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL": "GateHub BTC",
    "rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr": "CSC",
    "rHarBBhQg6F3XtDtw1FXvYQ1oP1mDCYZGA": "Ripple"
  };
  
  return issuerNames[issuer] || issuer.substring(0, 4) + "...";
}

// Manually defined popular tokens to ensure correct display
const manualTokens = [
  {
    currency: "XRP",
    issuer: "",
    name: "XRP (Native)",
    displayCurrency: "XRP"
  },
  {
    currency: "USD",
    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
    name: "USD (Bitstamp)",
    displayCurrency: "USD"
  },
  {
    currency: "EUR",
    issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    name: "EUR (GateHub)",
    displayCurrency: "EUR"
  },
  {
    currency: "BTC",
    issuer: "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL",
    name: "BTC (GateHub)",
    displayCurrency: "BTC"
  },
  {
    currency: "ETH",
    issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    name: "ETH (GateHub)",
    displayCurrency: "ETH"
  },
  {
    currency: "SOLO",
    issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz",
    name: "SOLO (Sologenic)",
    displayCurrency: "SOLO"
  },
  {
    currency: "CSC",
    issuer: "rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr",
    name: "CSC (CasinoCoin)",
    displayCurrency: "CSC"
  }
];

// Discover popular tokens on the XRPL
export async function discoverPopularTokens() {
  try {
    // Check if we have a valid cache
    const now = Date.now();
    if (popularTokensCache && (now - cacheTimestamp < CACHE_DURATION)) {
      return popularTokensCache;
    }

    // Start with manually defined tokens
    const tokens = [...manualTokens];
    
    // Connect to XRPL
    const client = new xrpl.Client("wss://s1.ripple.com");
    await client.connect();

    // Define well-known issuers
    const wellKnownIssuers = [
      "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", // Bitstamp
      "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq", // GateHub
      "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", // Sologenic
      "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL", // GateHub BTC
      "rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr"  // CSC
    ];

    // Get currencies for each issuer
    for (const issuer of wellKnownIssuers) {
      try {
        const response = await client.request({
          command: "account_currencies",
          account: issuer,
          strict: true
        });

        if (response.result.send_currencies) {
          for (const currency of response.result.send_currencies) {
            // Skip if already in the list
            if (tokens.some(t => t.currency === currency && t.issuer === issuer)) {
              continue;
            }

            // Decode the currency code
            const displayCurrency = decodeCurrencyCode(currency);
            
            // Skip if it's just a numeric code (likely a bad token)
            if (/^\d+$/.test(displayCurrency)) {
              continue;
            }
            
            // Get issuer name
            const issuerName = getIssuerName(issuer);
            
            // Create a friendly name
            const name = `${displayCurrency} (${issuerName})`;

            tokens.push({
              currency,
              issuer,
              name,
              displayCurrency
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching currencies for issuer ${issuer}:`, error.name);
      }
    }

    // Sort tokens by name, with XRP first
    tokens.sort((a, b) => {
      // Always put XRP first
      if (a.currency === "XRP") return -1;
      if (b.currency === "XRP") return 1;
      
      // Handle undefined or null values safely
      const aName = a.displayCurrency || a.currency || "";
      const bName = b.displayCurrency || b.currency || "";
      
      return aName.localeCompare(bName);
    });

    // Filter out tokens with numeric-only display names
    const filteredTokens = tokens.filter(token => {
      if (token.currency === "XRP") return true;
      if (!token.displayCurrency) return false;
      
      // Skip purely numeric currency codes
      return !/^\d+$/.test(token.displayCurrency);
    });

    // Update cache
    popularTokensCache = filteredTokens;
    cacheTimestamp = now;

    // Disconnect from XRPL
    await client.disconnect();

    return filteredTokens;
  } catch (error) {
    console.error('Error discovering popular tokens:', error);
    // Return the manual list if there's an error
    return manualTokens;
  }
}

// Search for tokens by name, currency code, or issuer
export async function searchTokens(query) {
  try {
    // Get all popular tokens as a base
    const allTokens = await discoverPopularTokens();
    
    // If query is empty, return all tokens
    if (!query || query.trim() === '') {
      return allTokens;
    }
    
    // Normalize the query
    const normalizedQuery = query.toLowerCase().trim();
    
    // Filter tokens based on the query
    const results = allTokens.filter(token => {
      // Check currency code
      if (token.currency.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check display currency
      if (token.displayCurrency && token.displayCurrency.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check name
      if (token.name && token.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check issuer
      if (token.issuer && token.issuer.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      return false;
    });
    
    return results;
  } catch (error) {
    console.error('Error searching tokens:', error);
    return [];
  }
}
