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
    error: true
  },
  {
    title: 'function, returns boolean, fail',
    test: (v) => {
      return v > 10
    },
    value: 5,
    error: true
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
    error: 'not minus'
  },
  {
    title: 'function, returns Error',
    test: (v) => {
      if (v > 10) {
        return true
      }

      return new Error('a')
    },
    error: 'a'
  },
  {
    title: 'array tester',
    test: [
      /\d{11}/,
      /1\d{10}/
    ],
    value: '08800001111',
    error: true
  }
]

cases.forEach((c) => {
  const {
    title,
    test,
    value,
    error,
    only,
    codec,
    initError
  } = c

  const description = title
    || `${test.toString()}, ${value}, ${error ? 'fail' : 'pass'}`

  const _test = only
    ? ava.only.cb
    : ava.cb

  let options = {}

  if (codec) {
    options.codec = codec
  }

  _test(description, t => {
    let v

    try {
      v = new Validator(test, options)
    } catch (e) {
      if (initError) {
        t.end()
        return
      }
    }

    if (initError) {
      t.fail()
    }

    v.check(value, (err, success) => {
      if (!error) {
        if (err) {
          t.fail()
          t.end()
          return
        }

        t.is(success, true)
        t.end()
        return
      }

      if (error === true) {
        t.is(err, true)
      } else {
        t.is(err instanceof Error, true)
        t.is(error, err.message)
      }

      t.is(success, false)
      t.end()
    })
  })
})
