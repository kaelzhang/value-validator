import ava from 'ava'
import Validator from '..'

const cases = [
  {
    // only: true,
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
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (v < 0) {
            return resolve(true)
          }

          reject('not minus')
        }, 10)
      })
    },
    value: 1,
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
    title: 'thenable',
    test: (x) => {
      return {
        then: (done) => {
          done(x === 1)
        }
      }
    },
    value: 1,
    pass: true
  }
]

cases.forEach((c) => {
  const {
    title,
    test,
    value,
    error,
    pass,
    only
  } = c

  const result = pass === false
    ? false
    : true

  const description = title
    || `${test.toString()}, ${value}, ${error ? 'fail' : 'pass'}`

  const _test = only
    ? ava.only
    : ava

  _test(description, t => {
    let v

    try {
      v = new Validator(test)
    } catch (e) {
      console.error(e)
      t.fail()
      return
    }

    v.validate(value).then(
      success => {
        t.is(success, result)
      },

      err => {
        t.is(err.message || err, error)
      }
    )
  })
})
