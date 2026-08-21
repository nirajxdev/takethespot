#!/bin/bash
sed -i 's/if (plotsRes.ok) setPlots(await plotsRes.json());/if (plotsRes.ok) setPlots(await plotsRes.json());\n      if (plotsRes.status === 401 || configRes.status === 401) handleLogout();/' src/components/AdminPanel.tsx
