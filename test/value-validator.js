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
  }
]

cases.forEach((c) => {
  const {
    title,
    test,
    value,
    error,
    only,
    codec
  } = c

  const description = title || `${test.toString()} : ${value}`

  const _test = only
    ? ava.only.cb
    : ava.cb

  let options = {}

  if (codec) {
    options.codec = codec
  }

  _test(description, t => {
    new Validator(test, options).check(value, (err, success) => {
      if (!error) {
        if (err) {
          t.fail()
          return
        }

        t.is(success, true)
        t.end()
        return
      }

      if (error instanceof Error) {
        t.is(error, err.message)
      } else {
        t.is(err, true)
      }

      t.is(success, false)
      t.end()
    })
  })
})
