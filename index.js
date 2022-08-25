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

    while(!originalOrder) {
      console.log("ERRO AO CRIAR ORDEM A MERCADO!")
      originalOrder = await createOriginalOrder()
    }

    const originalOrderPrice = originalOrder.avgPrice

    linha();
    console.log('COMPRA A MERCADO')
    console.log(`Horario: ${datefns.format(new Date(originalOrder.updateTime), "dd/MM/yyyy H:mm")}`)
    console.log(`Preço: ${parseInt(originalOrderPrice)} USDT`)
    console.log(`Quantidade (${leverage}x): ${originalOrder.origQty} BTC`)
    pulaLinha()
    
    // DEFINIR O TAKE PROFIT
    let takeProfitOrder = await createTakeProfitOrder(originalOrderPrice)

    while(!takeProfitOrder) {
      console.log("ERRO AO CRIAR TAKE PROFIT!")
      takeProfitOrder = await takeProfitOrder(originalOrderPrice)
    }

    console.log('TAKE PROFIT')
    console.log(`Preço: ${parseInt(takeProfitOrder.stopPrice)} USDT`)
    pulaLinha()

    // DEFINIR O STOP LOSS
    let stopLossOrder = await createStopLossOrder(originalOrderPrice)

    while(!stopLossOrder) {
      stopLossOrder = await createStopLossOrder(originalOrderPrice)
    }

    console.log('STOP LOSS')
    console.log(`Preço: ${parseInt(stopLossOrder.stopPrice)} USDT`)
    stopLossorderId = stopLossOrder.orderId
    pulaLinha()
  }catch (err) {
    console.log('ERRO AO REALIZAR TRADE')
    console.log(err)
    console.log(`Obs: caiu ${stopLoss} vezes seguidas`)
    linha()
    pulaLinha()
  }
  linha();
  pulaLinha();
}

setInterval(async () => {
  if(stopLossorderId === 0) {
    const alavancagem = await api.leverage(symbol, leverage)
    console.log(`Iniciando com a alavancagem de: ${alavancagem.leverage}x`)
    await realizarTrade()
  }else {
    const status = await getStopLossStatus()
    
    if(status !== 'NEW') {
      if(status === 'FILLED') {
        stopLoss++
        aposta = aposta * 2
      }else {
        stopLoss = 0
        aposta = tradeBase
      }
      await realizarTrade()
    }
  }

  /*
  if(caiu3Status === '') {
    linha();
    const alavancagem = await api.leverage(symbol, leverage)
    console.log(`Iniciando com a alavancagem de: ${alavancagem.leverage}x`)
    linha();
    pulaLinha()
    // realizarTrade()
  }else {
    const { status } = await api.getOrder(symbol, caiu3orderId)
    caiu3Status = status

    if (caiu3Status !== 'NEW') {
      if (caiu3Status === 'FILLED') {
        if (caiu3 === 1) {
          console.log("DEU MERDA!")
        }else {
          linha()
          console.log('PERDI NA APOSTA, DOBRANDO...')
          linha()
          tradeBase = 0.256
          realizarTrade()
        }
      }else {
        linha()
        console.log('GANHEI NA APOSTA...')
        linha()
        caiu3 = 0
        tradeBase = process.env.TRADE_BASE
        realizarTrade()
      }
    }
  }
  */
}, env.CRAWLER_INTERVAL)