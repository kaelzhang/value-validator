import test from 'ava'
import V from '..'

const presets = {
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
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (v === 'foo') {
          return reject('foo already taken')
        }

        resolve(true)
      }, 10)
    })
  },

  between: (v, min, max) => {
    return v.length >= Number(min) && v.length <= Number(max)
  },

  'min-length-6-username': [
    'min-length:6',
    'username'
  ]
}

const Validator = V.defaults({
  presets
})


test('simple global preset', t => {
  return new Validator('mobile').validate('18800001111').then(result => {
    t.is(result, true)
  })
})

test('preset with arguments', t => {
  return new Validator('max-length:3').validate('1234').then(result => {
    t.is(result, false)
  })
})

test('preset with improper length of arguments', t => {
  try {
    new Validator('max-length:1,2')
  } catch (e) {
    return
  }

  t.fail('it should throw an error.')
})

test('multiple presets, [1, 3] test "12"', t => {
  return new Validator('max-length:3|min-length:1')
  .validate('12')
  .then(result => {
    t.is(result, true)
  })
})

test('multiple presets, [1, 3] test "1234"', t => {
  return new Validator('max-length:3|min-length:1')
  .validate('1234')
  .then(result => {
    t.is(result, false)
  })
})

test('multiple presets, [1, 3] test ""', t => {
  return new Validator('max-length:3|min-length:1')
  .validate('')
  .then(result => {
    t.is(result, false)
  })
})

test('async preset, min:6, and username, foo, fail', t => {
  return new Validator('min-length:6|username')
  .validate('foo')
  .then(result => {
    t.is(result, false)
  })
})

test('min-length-6-username, foo, fail', t => {
  return new Validator('min-length-6-username')
  .validate('foo')
  .then(result => {
    t.is(result, false)
  })
})

test('async preset, min:3, and username, foo, fail', t => {
  return new Validator('min-length:3|username')
  .validate('foo')
  .then(
    () => t.fail('should fail'),
    err => t.is(err, 'foo already taken')
  )
})

test('async preset, min:3, and username, bar, success', t => {
  return new Validator('min-length:3|username')
  .validate('bar')
  .then(result => {
    t.is(result, true)
  })
})

test('preset with multiple arguments', t => {
  return new Validator('between:2,6')
  .validate('1234')
  .then(result => {
    t.is(result, true)
  })
})
