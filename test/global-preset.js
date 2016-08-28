const test = require('ava')
const Validator = require('..')

Validator.registerPresets({
  'min-length': (v, min) => {
    return v.length >= Number(min)
  },

  'max-length': (v, max) => {
    return v.length <= Number(max)
  },

  mobile: (v) => {
    return /1\d{10}/.test(v)
  },

  username: function (v) {
    const done = this.async()
    setTimeout(() => {
      if (v === 'foo') {
        return done('foo already taken')
      }

      done(null)
    }, 10)
  },

  between: (v, min, max) => {
    return v.length >= Number(min) && v.length <= Number(max)
  },

  'min-length-6-username': [
    'min-length:6',
    'username'
  ]
})


test.cb('simple global preset', t => {
  new Validator('mobile').validate('18800001111', (err, result) => {
    t.is(err, null)
    t.is(result, true)
    t.end()
  })
})

test.cb('preset with arguments', t => {
  new Validator('max-length:3').validate('1234', (err, result) => {
    t.is(err, null)
    t.is(result, false)
    t.end()
  })
})

test.cb('preset with improper length of arguments', t => {
  try {
    new Validator('max-length:1,2')
  } catch (e) {
    t.end()
    return
  }

  t.fail('it should throw an error.')
  t.end()
})

test.cb('multiple presets, [1, 3] test "12"', t => {
  new Validator('max-length:3|min-length:1').validate('12', (err, result) => {
    t.is(err, null)
    t.is(result, true)
    t.end()
  })
})

test.cb('multiple presets, [1, 3] test "1234"', t => {
  new Validator('max-length:3|min-length:1').validate('1234', (err, result) => {
    t.is(err, null)
    t.is(result, false)
    t.end()
  })
})

test.cb('multiple presets, [1, 3] test ""', t => {
  new Validator('max-length:3|min-length:1').validate('', (err, result) => {
    t.is(err, null)
    t.is(result, false)
    t.end()
  })
})

test.cb('async preset, min:6, and username, foo, fail', t => {
  new Validator('min-length:6|username').validate('foo', (err, result) => {
    t.is(err, null)
    t.is(result, false)
    t.end()
  })
})

test.cb('min-length-6-username, foo, fail', t => {
  new Validator('min-length-6-username').validate('foo', (err, result) => {
    t.is(err, null)
    t.is(result, false)
    t.end()
  })
})

test.cb('async preset, min:3, and username, foo, fail', t => {
  new Validator('min-length:3|username').validate('foo', (err, result) => {
    t.is(err instanceof Error, true)
    t.is(err.message, 'foo already taken')
    t.is(result, false)
    t.end()
  })
})

test.cb('async preset, min:3, and username, bar, success', t => {
  new Validator('min-length:3|username').validate('bar', (err, result) => {
    t.is(err, null)
    t.is(result, true)
    t.end()
  })
})

test.cb('preset with multiple arguments', t => {
  new Validator('between:2,6').validate('1234', (err, result) => {
    t.is(err, null)
    t.is(result, true)
    t.end()
  })
})
