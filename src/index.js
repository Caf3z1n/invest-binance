const api = require('./api')
const env = require('../env')
const { rsiema } = require('./indicators/rsiema')
const { addMinutes } = require('date-fns')

const limiteCandle = env.LIMITE_CANDLE
const divisorPerda = env.DIVISOR_PERDA
const divisorGanho = env.DIVISOR_GANHO

const shortEntradaRsi = env.SHORT_ENTRADA_RSI
const shortProfit = env.SHORT_PROFIT
const shortLeverage = env.SHORT_LEVERAGE
const longEntradaRsi = env.LONG_ENTRADA_RSI
const longProfit = env.LONG_PROFIT
const longLeverage = env.LONG_LEVERAGE

let divisor = divisorGanho

let linhaLimite = 0
let orderEntrada = 0

let orderProfit = 0

let short = false
let long = false

setInterval(async () => {
  const data = await rsiema()

  if(!data) {
    return
  }

  const barra = data[data.length - 2]

  if(barra.open <= barra.ema) {
    //SHORT

    if(!orderEntrada && !orderProfit && barra.rsi > shortEntradaRsi) {
      const leverage = await api.leverage({ leverage: shortLeverage })

      if(!leverage) {
        return console.log('SHORT: Erro ao definir leverage')
      }
  
      const balance = await api.balance({ symbol: 'USDT' })
  
      if(!balance) {
        return console.log('SHORT: Erro ao buscar balanço')
      }

      const price = (Number(barra.high) + (Number(barra.high) * shortProfit)).toFixed(0)
      const quantity = (((balance / divisor) * shortLeverage) / price).toFixed(3)

      const responseOrder = await api.newOrderLimit({ side: 'SELL', quantity, price, })  
  
      if(!responseOrder) {
        return console.log('SHORT: Erro ao criar ordem limite de entrada')
      }
  
      console.log(`SHORT: Order limit definido! ${new Date()}`)
      orderEntrada = responseOrder.orderId
      linhaLimite = addMinutes(barra.open_time, 5 * limiteCandle)

      short = true
      long = false
    }
  }else {
    //LONG

    if(!orderEntrada && !orderProfit && barra.rsi < longEntradaRsi) {
      const leverage = await api.leverage({ leverage: longLeverage })

      if(!leverage) {
        return console.log('LONG: Erro ao definir leverage')
      }
  
      const balance = await api.balance({ symbol: 'USDT' })
  
      if(!balance) {
        return console.log('LONG: Erro ao buscar balanço')
      }

      const price = (Number(barra.low) - (Number(barra.low) * longProfit)).toFixed(0)
      const quantity = (((balance / divisor) * longLeverage) / price).toFixed(3)
      
      const responseOrder = await api.newOrderLimit({ side: 'BUY', quantity, price, })  
  
      if(!responseOrder) {
        return console.log('LONG: Erro ao criar ordem limite de entrada')
      }
  
      console.log(`LONG: Order limit definido! ${new Date()}`)
      orderEntrada = responseOrder.orderId
      linhaLimite = addMinutes(barra.open_time, 5 * limiteCandle)

      short = false
      long = true
    }
  }

  if(short) {
    //SHORT

    if(orderEntrada) {
      const order = await api.getOrder({ orderId: orderEntrada })
  
      if(!order) {
        return console.log('SHORT: Erro ao buscar ordem limit')
      }
  
      if(order.status === 'FILLED') {
        console.log(`SHORT: Order limit realizado! ${new Date()}`)
  
        const quantity = Number(order.executedQty).toFixed(3)
  
        const stopPrice = (Number(order.price) - (Number(order.price) * shortProfit)).toFixed(0)
        const responseOrderTake = await api.newOrderStopTakeMarket({ side: 'BUY', stopPrice, quantity })
  
        if(!responseOrderTake) {
          return console.log('SHORT: Erro ao criar ordem teke profit!')
        }
  
        orderProfit = responseOrderTake.orderId
        orderEntrada = 0
        linhaLimite = 0
  
        console.log(`SHORT: Take profit definido ${new Date()}`)
      }else if(linhaLimite <= barra.open_time) {
        const cancel = await api.cancelAllOrders()
  
        if(!cancel) {
          return console.log('SHORT: Erro ao cancelar ordem limit')
        }
  
        orderEntrada = 0
        linhaLimite = 0

        short = false
        long = false
  
        console.log(`SHORT: Order limit cancelado! ${new Date()}`)
        console.log()
      }
    }
  
    if(orderProfit) {
      const order = await api.getOrder({ orderId: orderProfit })
  
      if(!order) {
        return console.log('SHORT: Erro ao buscar ordem take profit')
      }
  
      if(order.status === 'FILLED') {
        console.log(`SHORT: Lucro realizado! ${new Date()}`)
        console.log()
  
        divisor = divisorGanho
        orderProfit = 0

        short = false
        long = false
      }else if(order.status === 'EXPIRED') {
        console.log(`SHORT: Perdi a aposta! ${new Date()}`)
        console.log()
  
        divisor = divisorPerda
        orderProfit = 0

        short = false
        long = false
      }else {
        return
      }
    }
  }else if(long) {
    //LONG

    if(orderEntrada) {
      const order = await api.getOrder({ orderId: orderEntrada })
  
      if(!order) {
        return console.log('LONG: Erro ao localizar ordem limit')
      }
  
      if(order.status === 'FILLED') {
        console.log(`LONG: Order limit realizado! ${new Date()}`)
  
        const quantity = Number(order.executedQty).toFixed(3)
  
        const stopPrice = (Number(order.price) + (Number(order.price) * longProfit)).toFixed(0)
        const responseOrderTake = await api.newOrderStopTakeMarket({ side: 'SELL', stopPrice, quantity })
  
        if(!responseOrderTake) {
          return console.log('LONG: Erro ao criar ordem teke profit!')
        }
  
        orderProfit = responseOrderTake.orderId
        orderEntrada = 0
        linhaLimite = 0
  
        console.log(`LONG: Take profit definido ${new Date()}`)
      }else if(linhaLimite <= barra.open_time) {
        const cancel = await api.cancelAllOrders()
  
        if(!cancel) {
          return console.log('LONG: Erro ao cancelar ordem limit')
        }
  
        orderEntrada = 0
        linhaLimite = 0

        short = false
        long = false
  
        console.log(`LONG: Order limit cancelado! ${new Date()}`)
        console.log()
      }
    }
  
    if(orderProfit) {
      const order = await api.getOrder({ orderId: orderProfit })
  
      if(!order) {
        return console.log('LONG: Erro ao buscar ordem take profit')
      }
  
      if(order.status === 'FILLED') {
        console.log(`LONG: Lucro realizado! ${new Date()}`)
        console.log()
  
        divisor = divisorGanho
        orderProfit = 0

        short = false
        long = false
      }else if(order.status === 'EXPIRED') {
        console.log(`LONG: Perdi a aposta! ${new Date()}`)
        console.log()
  
        divisor = divisorPerda
        orderProfit = 0

        short = false
        long = false
      }else {
        return
      }
    }
  }
}, env.CRAWLER_INTERVAL)
