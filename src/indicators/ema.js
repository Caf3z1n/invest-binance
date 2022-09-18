const EMA = require('technicalindicators').EMA

function ema({ data, period }) {
  const close = data.map((c) => c.close)

  const emaData = EMA.calculate({ values: close, period })

  let dados = []
  for(let i = period * 4; i < emaData.length; i++) {
    dados.push({
      ...data[i + (period - 1)],
      ema: emaData[i]
    })
  }

  return dados;
}

module.exports = { ema }