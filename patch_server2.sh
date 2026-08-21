#!/bin/bash
# Insert config loading and saving
sed -i '/const DATA_FILE =/i const CONFIG_FILE = path.join(process.cwd(), "config.json");' server.ts
sed -i '/async function fileExists/i async function loadMarketConfig() {\n  if (await fileExists(CONFIG_FILE)) {\n    const data = await fs.readFile(CONFIG_FILE, "utf-8");\n    Object.assign(MARKET_CONFIG, JSON.parse(data));\n  }\n}\n\nasync function saveMarketConfig() {\n  await fs.writeFile(CONFIG_FILE, JSON.stringify(MARKET_CONFIG, null, 2));\n}\n' server.ts
sed -i '/async function startServer()/a \ \ await loadMarketConfig();' server.ts
