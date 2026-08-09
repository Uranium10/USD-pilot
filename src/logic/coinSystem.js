import { COIN_ASSET_ID, COIN_SELL_SPREAD } from '../config.js'

const COIN_QUANTITY_SCALE = 10000

export function isCoinAsset(assetOrId) {
  return typeof assetOrId === 'string' ? assetOrId === COIN_ASSET_ID : assetOrId?.assetType === 'coin'
}

export function buyExecutionPrice(asset, marketPrice) {
  return marketPrice
}

export function sellExecutionPrice(asset, marketPrice) {
  return isCoinAsset(asset) ? marketPrice * (1 - COIN_SELL_SPREAD) : marketPrice
}

export function normalizeTradeQuantity(asset, quantity) {
  const numeric = Math.max(0, Number(quantity) || 0)
  return isCoinAsset(asset)
    ? Math.floor(numeric * COIN_QUANTITY_SCALE) / COIN_QUANTITY_SCALE
    : Math.floor(numeric)
}

export function formatAssetQuantity(asset, quantity) {
  if (!isCoinAsset(asset)) return Math.floor(quantity || 0).toLocaleString('ko-KR')
  return Number(quantity || 0).toLocaleString('ko-KR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}
