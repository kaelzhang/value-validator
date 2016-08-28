const ava = require('ava')
const Validator = require('..')

const cases = [
  {
    test: /\d{2,6}/,
    value: '1234'
  },
  {
    test: /1\d{10}/,
    value: '1880000',
    pass: false
  },
  {
    title: 'function, returns boolean, fail',
    test: (v) => {
      return v > 10
    },
    value: 5,
    pass: false
  },
  {
    title: 'function, returns boolean, pass',
    test: (v) => {
      return v > 10
    },
    value: 11
  },
  {
    title: 'async function, pass',
    test: function (v) {
      const done = this.async()
      setTimeout(() => {
        if (v < 0) {
          return done(null)

        }

        done('not minus')
      }, 10)
    },
    error: 'not minus',
    pass: false
  },
  {
    title: 'function, returns Error',
    test: (v) => {
      if (v > 10) {
        return true
      }

      return new Error('a')
    },
    error: 'a',
    pass: false
  },
  {
    title: 'array tester',
    test: [
      /\d{11}/,
      /1\d{10}/
    ],
    value: '08800001111',
    pass: false
  },
  {
    title: 'preset',
    test: [
      'maxlength:5'
    ],
    presets: {
      maxlength: (v, max) => {
        return v.length <= Number(max)
      }
    },
    value: '1234'
  },
  {
    title: 'preset with multiple arguments',
    test: [
      'between:2,6'
    ],
    presets: {
      between: (v, min, max) => {
        return v.length >= Number(min) && v.length <= Number(max)
      }
    },
    value: '1234'
  },
  {
    title: 'preset init error',
    test: [
      'maxlength:5,6'
    ],
    presets: {
      maxlength: (v, max) => {
        return v.length <= Number(max)
      }
    },
    initError: true
  }
]

cases.forEach((c) => {
  const {
    title,
    test,
    value,
    error,
    pass,
    only,
    codec,
    initError,
    presets
  } = c

  const result = pass === false
    ? false
    : true

  const description = title
    || `${test.toString()}, ${value}, ${error ? 'fail' : 'pass'}`

  const _test = only
    ? ava.only.cb
    : ava.cb

  let options = {}

  if (codec) {
    options.codec = codec
  }

  if (presets) {
    options.presets = presets
  }

  _test(description, t => {
    let v

    try {
      v = new Validator(test, options)
    } catch (e) {
      if (!initError) {
        t.fail()
        t.end()
        return
      }
    }

    if (initError) {
      t.end()
      return
    }

    v.check(value, (err, success) => {
      t.is(success, result)

      if (err) {
        t.is(err.message, error)
      } else {
        t.is(err, null)
      }

      t.end()
    })
  })
})
