const { subHours, addHours } = require('date-fns')
const { publicCall } = require('../api');

const { rsi } = require('./rsi');
const { ema } = require('./ema');
const env = require('../../env')

const symbol = env.SYMBOL

async function rsiema() {
  try {
    const hourData = []

    const hoursCandles = await publicCall('/v1/klines', { symbol, interval: '1h', limit: '1100' })

    hoursCandles.forEach(candle => {
      hourData.push({
          open_time: candle[0],
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          close_time: candle[6],
      })
    });

    const emaData = ema({ data: hourData, period: 200 })

    const minutesData = []

    const minutesCandles = await publicCall('/v1/klines', { symbol, interval: '5m', limit: '800' })

    minutesCandles.forEach(candle2 => {
      minutesData.push({
          open_time: candle2[0],
          open: Number(candle2[1]),
          high: Number(candle2[2]),
          low: Number(candle2[3]),
          close: Number(candle2[4]),
          close_time: candle2[6],
      })
    });

    const rsiData = rsi({ data: minutesData, period: 14 })

    const data = []
    rsiData.forEach(candleRsi => {
      const candleEma = emaData.find(candleEma => candleRsi.open_time >= candleEma.open_time && candleRsi.open_time < addHours(candleEma.open_time, 1))

      if(candleEma) {
        data.push({
          ...candleRsi,
          ema: candleEma.ema
        })
      }
    });

    return data
  }catch(err) {
    console.log(err)
    return null
  }
}

module.exports = { rsiema }
