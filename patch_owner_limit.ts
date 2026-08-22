import fs from 'fs';

const code = fs.readFileSync('server.ts', 'utf-8');
const replacement = `
    const plots = await loadPlots();
    refreshExpirations(plots);

    // Calculate how many they already own
    const userOwnedCount = plots.filter(p => p.ownerId === ownerId).length;
    if (userOwnedCount + plotIds.length > 12) {
      return res.status(400).json({ error: \`You already own \${userOwnedCount} plots. You can only own a maximum of 12 plots total.\` });
    }

    let totalCost = 0;
`;
const updatedCode = code.replace(/    const plots = await loadPlots\(\);\s*refreshExpirations\(plots\);\s*let totalCost = 0;/, replacement);

fs.writeFileSync('server.ts', updatedCode);
