#!/bin/bash
sed -i 's/export const MARKET_CONFIG: MarketConfig = {/export let MARKET_CONFIG: MarketConfig = {/' server.ts
