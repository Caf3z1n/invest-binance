const api = require('./api')
const datefns = require('date-fns')
const env = require('./env')

const symbol = env.SYMBOL
const leverage = env.LEVERAGE
const porcentagemTake = env.PORCENTAGEM_TAKE
const porcentagemStop = env.PORCENTAGEM_STOP
const tradeBase = env.TRADE_BASE

let aposta = tradeBase
let stopLossorderId = 0
let stopLoss = 0

function linha() {
  console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-')
}

function pulaLinha() {
  console.log('')
}

async function getStopLossStatus() {
  const { status } = await api.getOrder(symbol, stopLossorderId)
  return status
}

async function createOriginalOrder() {
  try {
    // CRIAR UMA NOVA POSITION A MERCADO
    const originalOrder = await api.newOrder(symbol, aposta)
    // PEGAR O VALOR QUE PAGUEI NA POSITION A MERCADO
    return await api.getOrder(symbol, originalOrder.orderId)
  }catch (err) {
    console.log(err)
  }
}

async function createTakeProfitOrder(originalOrderPrice) {
  try{
    const valorTP = parseFloat(parseFloat(originalOrderPrice) + (parseFloat(originalOrderPrice) * porcentagemTake)).toFixed(2)
    return await api.newOrderLimit(symbol, aposta, valorTP, 'TAKE_PROFIT_MARKET')
  }catch (err) {
    console.log(err)
  }
}

async function createStopLossOrder(originalOrderPrice) {
  try {
    const valorSL = parseFloat(parseFloat(originalOrderPrice) - (parseFloat(originalOrderPrice) * porcentagemStop)).toFixed(2)
    return await api.newOrderLimit(symbol, aposta, valorSL, 'STOP_MARKET')
  }catch(err) {
    console.log(err)
  }
}

async function realizarTrade() {
  try {
    // ORDEM A MERCADO
    let originalOrder = await createOriginalOrder()
    const originalOrderPrice = originalOrder.avgPrice

    console.log('COMPRA A MERCADO')
    console.log(`Horario: ${datefns.format(datefns.subHours(originalOrder.updateTime, 3), "dd/MM/yyyy H:mm")}`)
    console.log(`Preço: ${parseInt(originalOrderPrice)} USDT`)
    console.log(`Quantidade (${leverage}x): ${originalOrder.origQty} BTC`)
    pulaLinha()

    try {
      // DEFINIR O TAKE PROFIT
      let takeProfitOrder = await createTakeProfitOrder(originalOrderPrice)

      console.log('TAKE PROFIT')
      console.log(`Preço: ${parseInt(takeProfitOrder.stopPrice)} USDT`)
      pulaLinha()

      try {
        // DEFINIR O STOP LOSS
        let stopLossOrder = await createStopLossOrder(originalOrderPrice)

        console.log('STOP LOSS')
        console.log(`Preço: ${parseInt(stopLossOrder.stopPrice)} USDT`)
        stopLossorderId = stopLossOrder.orderId

      }catch(err) {
        console.log('ERRO AO CRIAR STOP LOSS')
        await api.newOrder(symbol, aposta, 'SELL', true)
        aposta = aposta / 2
        stopLoss -= 1
      }
    }catch(err) {
      console.log('ERRO AO CRIAR TAKE PROFIT')
      await api.newOrder(symbol, aposta, 'SELL', true)
    }

  }catch(err) {
    console.log('ERRO AO COMPRAR A MERCADO')
    console.log(`STOP LOSS SEGUIDAS: ${stopLoss}`)
  }
}

setInterval(async () => {
  if(stopLossorderId === 0) {
    linha()
    pulaLinha()
    stopLoss = 0
    aposta = tradeBase
    const alavancagem = await api.leverage(symbol, leverage)
    console.log(`Iniciando com a alavancagem de: ${alavancagem.leverage}x`)
    pulaLinha()
    await realizarTrade()
  }else {
    const status = await getStopLossStatus()

    if(!status) {
      stopLossorderId = 0
    }
    
    if(status && status !== 'NEW') {
      if(status === 'FILLED') {
        stopLoss++
        aposta = aposta * 2
      }else {
        stopLoss = 0
        aposta = tradeBase
      }
      linha()
      pulaLinha()
      await realizarTrade()
    }
  }
}, env.CRAWLER_INTERVAL)