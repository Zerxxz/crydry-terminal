/**
 * Etherscan API client for real-time whale wallet data.
 * Works with free API key (5 calls/sec).
 */

const ETHERSCAN_BASE = "https://api.etherscan.io/api";
const API_KEY = process.env.ETHERSCAN_API_KEY || "";

// Known whale addresses (real addresses)
export const KNOWN_WHALES: Array<{
  address: string;
  label: string;
  ens?: string;
  chain: string;
}> = [
  { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label: "vitalik.eth", ens: "vitalik.eth", chain: "ETHEREUM" },
  { address: "0x28C6c06298d514Db089934071355E5743bf21d60", label: "Binance 14", chain: "ETHEREUM" },
  { address: "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549", label: "Binance 15", chain: "ETHEREUM" },
  { address: "0x56Eddb7aa87536c09CCc2793473599fD21A8b17F", label: "Wintermute", ens: "wintermute.eth", chain: "ETHEREUM" },
  { address: "0xA7EFAe728D2936e78BDA97dc267687568dD593f3", label: "OKX", chain: "ETHEREUM" },
  { address: "0x8103683202aa8DA10536036EDef04CDd865C225E", label: "Kraken", chain: "ETHEREUM" },
  { address: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503", label: "Binance 8", chain: "ETHEREUM" },
  { address: "0xF977814e90dA44bFA03b6295A0616a897441aceC", label: "Binance 6", chain: "ETHEREUM" },
  { address: "0x1B29DD8FF0eb3240238bf97caFD6edA190c3F394", label: "Jump Trading", ens: "jumptrading.eth", chain: "ETHEREUM" },
  { address: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF", label: "0x Exchange", chain: "ETHEREUM" },
  { address: "0x6B44ba0a126a2A1a8aa6cD1AdeeD002e141Bcd44", label: "Paradigm", chain: "ETHEREUM" },
  { address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", label: "wstETH Contract", chain: "ETHEREUM" },
  { address: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", label: "Binance 7", chain: "ETHEREUM" },
  { address: "0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489", label: "Robinhood", chain: "ETHEREUM" },
  { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f5E4E0", label: "Bitfinex", chain: "ETHEREUM" },
  { address: "0xCFFAd3200574698b78f32232aa9D63eABD290703", label: "a]cap", chain: "ETHEREUM" },
  { address: "0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0", label: "Kraken 4", chain: "ETHEREUM" },
  { address: "0x539C92186f7C6CC4CbF443F26eF84C595993C288", label: "Amber Group", chain: "ETHEREUM" },
  { address: "0x6Cc5F688a315f3dC28A7781717a9A798a59fDA7b", label: "OKX 2", chain: "ETHEREUM" },
  { address: "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2", label: "FTX Estate", chain: "ETHEREUM" },
];

export interface EtherscanBalance {
  address: string;
  balance: string; // in wei
  balanceEth: number;
}

export interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  gasUsed: string;
  gasPrice: string;
  functionName: string;
  isError: string;
}

/**
 * Fetch ETH balance for an address
 */
export async function fetchEthBalance(address: string): Promise<EtherscanBalance | null> {
  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "1") return null;

    const balanceWei = data.result;
    const balanceEth = Number(balanceWei) / 1e18;

    return { address, balance: balanceWei, balanceEth };
  } catch {
    return null;
  }
}

/**
 * Fetch recent transactions for a whale address
 */
export async function fetchRecentTxs(address: string, page = 1, offset = 25): Promise<EtherscanTx[] | null> {
  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "1") return null;

    return data.result;
  } catch {
    return null;
  }
}

/**
 * Fetch ERC-20 token transfers for an address
 */
export async function fetchTokenTransfers(address: string, page = 1, offset = 50): Promise<unknown[] | null> {
  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "1") return null;

    return data.result;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple ETH balances in one call
 */
export async function fetchMultipleBalances(addresses: string[]): Promise<Array<{ account: string; balance: string }> | null> {
  try {
    // Etherscan supports up to 20 addresses per call
    const batch = addresses.slice(0, 20).join(",");
    const url = `${ETHERSCAN_BASE}?module=account&action=balancemulti&address=${batch}&tag=latest&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "1") return null;

    return data.result;
  } catch {
    return null;
  }
}

/**
 * Fetch token approvals (ERC-20 approve events) for an address
 */
export async function fetchTokenApprovals(address: string): Promise<unknown[] | null> {
  try {
    // Fetch approve() event logs for the address
    // Topic0 for Approval(address,address,uint256) = 0x8c5be1e5...
    const approvalTopic = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
    const paddedAddress = "0x000000000000000000000000" + address.slice(2).toLowerCase();

    const url = `${ETHERSCAN_BASE}?module=logs&action=getLogs&fromBlock=0&toBlock=latest&topic0=${approvalTopic}&topic1=${paddedAddress}&page=1&offset=100&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "1") return null;

    return data.result;
  } catch {
    return null;
  }
}
