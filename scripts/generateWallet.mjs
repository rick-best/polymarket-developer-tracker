import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getPublicKey } from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { ensureDir, nowInShanghai } from "../src/config.mjs";

const label = "polymarket 开发者钱包";
const dir = "/Users/rickbest/Documents/Codex/wallets";
const file = path.join(dir, "polymarket-developer-wallet.json");
ensureDir(dir);

if (fs.existsSync(file)) {
  const existing = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(JSON.stringify({
    status: "exists",
    label: existing.label || existing.name,
    address: existing.address,
    file,
    note: "Wallet already exists; private key was not printed."
  }, null, 2));
  process.exit(0);
}

function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function createWallet() {
  const privateKeyBytes = crypto.randomBytes(32);
  const publicKey = getPublicKey(privateKeyBytes, false);
  const hash = keccak_256(publicKey.slice(1));
  return {
    address: `0x${toHex(hash.slice(-20))}`,
    privateKey: `0x${toHex(privateKeyBytes)}`
  };
}

const wallet = createWallet();
const record = {
  label,
  purpose: "Polymarket developer hot wallet for API/trading execution after explicit approval.",
  chain: "Polygon / EVM",
  address: wallet.address,
  privateKey: wallet.privateKey,
  mnemonic: "",
  createdAt: nowInShanghai(),
  importNote: "Import into MetaMask with label: polymarket 开发者钱包. Do not share this file or paste the private key into websites."
};

fs.writeFileSync(file, JSON.stringify(record, null, 2), { mode: 0o600 });
fs.chmodSync(file, 0o600);

console.log(JSON.stringify({
  status: "created",
  label,
  address: wallet.address,
  file,
  note: "Private key and mnemonic were saved locally and not printed."
}, null, 2));
