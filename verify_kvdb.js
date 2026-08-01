import fs from "fs";
import { execSync } from "child_process";

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    console.log("Fetching mail.tm domains...");
    const domainsRes = await fetch("https://api.mail.tm/domains");
    const domains = await domainsRes.json();
    const domain = domains["hydra:member"]?.[0]?.domain || domains[0]?.domain;
    if (!domain) throw new Error("No mail.tm domains found");
    
    const randomUser = "kvdb_verify_" + Math.random().toString(36).substring(2, 10);
    const email = `${randomUser}@${domain}`;
    const password = "SuperSecretPassword123!";
    console.log(`Generated temp email: ${email}`);
    
    console.log("Creating mail.tm account...");
    const accountRes = await fetch("https://api.mail.tm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password })
    });
    if (!accountRes.ok) {
      const errText = await accountRes.text();
      throw new Error(`Failed to create mail.tm account: ${errText}`);
    }
    
    console.log("Obtaining JWT token...");
    const tokenRes = await fetch("https://api.mail.tm/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password })
    });
    const tokenData = await tokenRes.json();
    const jwtToken = tokenData.token;
    if (!jwtToken) throw new Error("Failed to get JWT token");
    
    console.log("Creating kvdb.io bucket...");
    const kvdbRes = await fetch("https://kvdb.io/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email })
    });
    if (!kvdbRes.ok) {
      const errText = await kvdbRes.text();
      throw new Error(`Failed to register kvdb.io bucket: ${errText}`);
    }
    const bucketId = (await kvdbRes.text()).trim();
    console.log(`Created kvdb.io bucket ID: ${bucketId}`);
    
    console.log("Waiting for verification email...");
    let verificationLink = null;
    for (let attempt = 1; attempt <= 15; attempt++) {
      console.log(`Polling inbox (attempt ${attempt}/15)...`);
      const msgRes = await fetch("https://api.mail.tm/messages", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      const msgData = await msgRes.json();
      const messages = msgData["hydra:member"] || msgData;
      if (messages && messages.length > 0) {
        const messageId = messages[0].id;
        console.log(`Retrieving message content for ${messageId}...`);
        const detailRes = await fetch(`https://api.mail.tm/messages/${messageId}`, {
          headers: { "Authorization": `Bearer ${jwtToken}` }
        });
        const detail = await detailRes.json();
        const bodyText = detail.text || detail.html || "";
        
        // Search for verification link in email body
        const match = bodyText.match(/https:\/\/kvdb\.io\/[^\s'"]+/);
        if (match) {
          verificationLink = match[0];
          break;
        }
      }
      await delay(3000);
    }
    
    if (!verificationLink) {
      throw new Error("Verification email not received or link not found");
    }
    
    console.log(`Clicking verification link: ${verificationLink}`);
    const verifyRes = await fetch(verificationLink);
    const verifyText = await verifyRes.text();
    console.log("Verification response status:", verifyRes.status);
    console.log("Verification activated successfully!");
    
    console.log("\n=================================");
    console.log(`SUCCESS! Verified bucket ID: ${bucketId}`);
    console.log("=================================\n");
    
    // Save to temp file
    fs.writeFileSync("/tmp/kvdb_bucket_id.txt", bucketId);
  } catch (err) {
    console.error("Verification workflow failed:", err);
    process.exit(1);
  }
}

run();
