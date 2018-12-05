const ledble = require('../index')

// e8:eb:11:0e:bf:73 = hinter der couch
// ff:ff:97:02:3a:c8 = monument
// e8:eb:11:0f:8a:4c = überm beamer

const time = (sec) => new Promise((resolve) => {
  setTimeout(resolve, sec * 1000)
})

const main = async () => {
  try {
    const beamer = await ledble.Bulb('e8:eb:11:0f:8a:4c')
    await beamer.set_color(255,0,0)
  
  }
  catch(err) {
    console.error(err)
  }
  process.exit(0)
}

main()
