const noble = require('noble')

const DEBUG = true

const log = function() {
  if(DEBUG)
    console.log.apply(null,arguments)
}

const TIMEOUT = 5000
const SUPPORTED_SERVICE_UUIDS = [ 'ffd5', 'ffe5' ]
const SUPPORTED_CHARACTERISTIC_UUIDS = [ 'ffd9', 'ffe9' ]

const MESSAGES = {
  TURN_ON: [0xCC, 0x23, 0x33],
  TURN_OFF: [0xCC, 0x24, 0x33],
  SET_COLOR: [0x56, undefined, undefined, undefined, 0x00, 0xF0, 0xAA],
  SET_BRIGHTNESS: [0x56, 0x00, 0x00, 0x00, undefined, 0x0F, 0xAA],
  SET_EFFECT: [0xBB, undefined, undefined, 0x44]
}

function generate_message(msg, ...parameters) {
  const m = msg.slice(0)
  const p = Array.isArray(parameters) ? parameters.reverse() : []
  for(let i=0; i<m.length; i++) {
    if(m[i] == undefined) {
      m[i] = p.pop()
    }
  }
  return new Buffer(m)
}

const wait_power_on = () => new Promise((resolve, reject) => {
  if(noble.state == 'poweredOn') {
    resolve()
    return
  }

  let tries = 30

  let intervall = setInterval(() => {
    if(noble.state == 'poweredOn') {
      clearInterval(intervall)
      resolve()
      return
    }
    if(tries-- < 1) {
      reject(new Error('noble not going to powerOn'))
    }
  }, 100)
})

const find_service = (peripheral) => new Promise((resolve, reject) => {
  peripheral.discoverServices(SUPPORTED_SERVICE_UUIDS, (err, services) => {
    log('found services')
    if(err) {
      reject(new Error(err))
      return
    }
    if(services.length > 0) {
      resolve(services[0])
    }
    else {
      reject(new Error('no supported service found on device'))
    }
  })
})

const find_characteristic = (service) => new Promise((resolve, reject) => {
  service.discoverCharacteristics(SUPPORTED_CHARACTERISTIC_UUIDS, (err, characteristics) => {
    if(err) {
      reject(new Error(err))
      return
    }
    if(characteristics.length > 0) {
      resolve(characteristics[0])
    }
    else {
      reject(new Error('no supported characteristics found on service'))
    }
  })
})

const get_device = (address) => new Promise((resolve, reject) => {
  let got_device = false
  noble.on('discover', (peripheral) => {
    log('discovered', peripheral.address, peripheral.advertisement.localName)

    peripheral.on('disconnect', () => {
      log('disconnect on', peripheral.address)
    })

    if(peripheral.address == address) {
      got_device = true
      noble.stopScanning()

      log('got device, try connecting')

      peripheral.connect((err) => {
        if(err) {
          reject(new Error(err))
          return
        }
        log('connected, discovering services')

        find_service(peripheral)
        .then((service) => {
          log('got service', service.uuid)
          return find_characteristic(service)
        })
        .then((characteristic) => {
          log('got characteristic', characteristic.uuid)
          resolve(characteristic)
        })
        .catch(reject)
      })
    }
  })

  noble.startScanning()

  // timeout
  setTimeout(() => {
    if(!got_device) {
      noble.stopScanning()
      reject(new Error('device not found'))
    }
  }, TIMEOUT)
})

module.exports = {
  Bulb: async (address) => {      
    await wait_power_on()
    const device = await get_device(address)
    const write = (msg) => new Promise((resolve, reject) => {
      device.write(msg, false, (err) => {
        if(err) {
          reject(err)
          return
        }
        resolve()
      })
    })

    return {
      turn_on: async () => {
        await write(generate_message(MESSAGES.TURN_ON))
      },
      turn_off: async () => {
        await write(generate_message(MESSAGES.TURN_OFF))
      },
      set_color: async (red,green,blue) => {
        await write(generate_message(MESSAGES.SET_COLOR, red, green, blue))
      },
      set_brightness: async (brightness) => {
        await write(generate_message(MESSAGES.SET_BRIGHTNESS, brightness))
      },
      set_effect: async (effect, speed) => {
        await write(generate_message(MESSAGES.SET_EFFECT, effect, speed))
      }
    }
  },

  Effect: {
    SEVEN_COLOR_CROSS_FADE: 0X25,
    RED_GRADUAL_CHANGE: 0X26,
    GREEN_GRADUAL_CHANGE: 0X27,
    BLUE_GRADUAL_CHANGE: 0X28,
    YELLOW_GRADUAL_CHANGE: 0X29,
    CYAN_GRADUAL_CHANGE: 0X2A,
    PURPLE_GRADUAL_CHANGE: 0X2B,
    WHITE_GRADUAL_CHANGE: 0X2C,
    RED_GREEN_CROSS_FADE: 0X2D,
    RED_BLUE_CROSS_FADE: 0X2E,
    GREEN_BLUE_CROSS_FADE: 0X2F,
    SEVEN_COLOR_STOBE_FLASH: 0X30,
    RED_STROBE_FLASH: 0X31,
    GREEN_STROBE_FLASH: 0X32,
    BLUE_STROBE_FLASH: 0X33,
    YELLOW_STROBE_FLASH: 0X34,
    CYAN_STROBE_FLASH: 0X35,
    PURPLE_STROBE_FLASH: 0X36,
    WHITE_STROBE_FLASH: 0X37,
    SEVEN_COLOR_JUMPING_CHANGE: 0X38
  }
}