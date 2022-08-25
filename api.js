const axios = require('axios')
const querystring = require('querystring')
const crypto = require('crypto')

const apiKey = process.env.API_KEY
const apiSecret = process.env.API_SECRET
const apiUrl = process.env.API_URL

async function privateCall(path, data = {}, method = 'GET') {
  const timestamp = Date.now();
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(`${querystring.stringify({ ...data, timestamp })}`)
    .digest('hex');

  const newData = { ...data, timestamp, signature }
  const qs = `?${querystring.stringify(newData)}`

  try {
    const response = await axios({
      method,
      url: `${apiUrl}${path}${qs}`,
      headers: { 'X-MBX-APIKEY': apiKey }
    })

    return response.data
  }catch (err) {
    console.log(err)
  }

}

async function getOrder(symbol, orderId) {
  return privateCall('/v1/order', { symbol, orderId })
}

async function newOrder(symbol, quantity, price, side = 'BUY', type='MARKET') {
  const data = { symbol, side, type, quantity }

  if(price) data.price = price;
  if(type === 'LIMIT') data.timeInForce = 'GTC';

  return privateCall('/v1/order', data, 'POST')
}

async function newOrderLimit(symbol, quantity, stopPrice, type) {
  const data = { 
    symbol,
    quantity,
    stopPrice,
    type,
    side: 'SELL',
    positionSide: 'BOTH',
    timeInForce: 'GTE_GTC',
    reduceOnly: true,
    // workingType: 'MARK_PRICE'
  }

  return privateCall('/v1/order', data, 'POST')
}

async function leverage(symbol, leverage) {
  const data = { symbol, leverage }

  return privateCall('/v1/leverage', data, 'POST')
}

async function publicCall(path, data, method = 'GET') {
  try {
    const qs = data ? `?${querystring.stringify(data)}` : ''
    const response = await axios({
      method,
      url: `${apiUrl}${path}${qs}`
    })

    return response.data
  }catch (err) {
    console.log(err)
  }
}

async function time() {
  return publicCall('/v1/time')
}

module.exports = { time, leverage, newOrder, getOrder, newOrderLimit }
