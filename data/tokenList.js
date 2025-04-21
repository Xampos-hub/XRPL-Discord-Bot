// Static list of supported tokens for XRPL swaps
export const tokenList = [
  {
    currency: "XRP",
    issuer: null,  // XRP is native and has no issuer
    name: "XRP (Native)",
    shortName: "XRP",
    description: "The native currency of the XRP Ledger",
    icon: "💠"
  },
  {
    currency: "534F4C4F00000000000000000000000000000000", // Hex for "SOLO"
    issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz",
    name: "Sologenic (SOLO)",
    shortName: "SOLO",
    description: "Tokenized securities and crypto trading platform",
    icon: "🌐"
  },
  {
    currency: "524C555344000000000000000000000000000000", // Hex for "RLUSD"
    issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
    name: "Ripple USD (RLUSD)",
    shortName: "RLUSD",
    description: "Official USD stablecoin issued by Ripple",
    icon: "💵"
  },
  {
    currency: "USD",
    issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    name: "GateHub USD",
    shortName: "USD.GateHub",
    description: "USD stablecoin issued by GateHub",
    icon: "💵"
  },
  {
    currency: "USD",
    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
    name: "Bitstamp USD",
    shortName: "USD.Bitstamp",
    description: "USD stablecoin issued by Bitstamp",
    icon: "💵"
  }
];

// Helper function to get token by currency and issuer
export function getToken(currency, issuer) {
  return tokenList.find(token => 
    token.currency === currency && 
    (
      (token.issuer === issuer) || 
      (token.issuer === null && issuer === null || issuer === undefined)
    )
  );
}

// Helper function to get token by its index in the list
export function getTokenByIndex(index) {
  if (index >= 0 && index < tokenList.length) {
    return tokenList[index];
  }
  return null;
}
