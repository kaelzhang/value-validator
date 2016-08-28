'use strict'

const make_array = require('make-array')
const wrap = require('wrap-as-async')
const async = require('async')

const util = require('util')


class Validator {
  constructor (rules, {
    codec = default_codec,
    presets
  } = {}) {

    this._codec = codec
    this._presets = {}
    this._context = null
    this._rules = []

    if (presets) {
      this._setPresets(presets)
    }

    make_array(rules).forEach((rule) => {
      this.add(rule)
    })
  }

  context (context) {
    this._context = context
    return this
  }

  add (rule) {
    const cleaned = this._sanitize(rule)
    this._rules = this._rules.concat(cleaned)
    return this
  }

  check (v, callback) {
    async.everySeries(this._rules, (tester, done) => {
      const isAsync = tester.call(
        this._context, v,
        (err, pass) => {
          err = typeof err === 'string'
            ? new Error(err)
            : err || null

          pass = determine_pass(err, pass)
          done(err, pass)
        }
      )
    }, (err, pass) => {
      // async.everySeries sets `pass` as `undefined`
      // if there is an error encountered.
      callback(err, determine_pass(err, pass))
    })
  }

  _setPresets (map) {
    let key
    for (key in map) {
      this._setPreset(key, map[key])
    }

    return this
  }

  _setPreset (name, method) {
    if (name in this._presets) {
      throw new Error(`value-validator: preset "${name}" defined.`)
    }

    this._presets[name] = method
    return this
  }

  _sanitize (rule) {
    if (typeof rule === 'string') {
      return this._decodePreset(rule)
    }

    if (typeof rule === 'function') {
      return wrap(rule)
    }

    if (util.isRegExp(rule)) {
      return wrap((v) => {
        return rule.test(v)
      })
    }

    const str = rule && rule.toString
      ? rule.toString()
      : ''

    throw new Error(`value-validator: invalid rule "${str}"`)
  }

  _decodePreset (rule) {
    return this._codec(rule)
    .map(({name, args}) => {
      const method = this._presets[name] || Validator.PRESETS[name]

      if (!method) {
        throw new Error(`value-validator: unknown preset "${name}".`)
      }

      // The first argument is the value
      const expectedArgLength = method.length - 1
      const wrapped = wrap(method)

      if (expectedArgLength !== args.length) {
        const message = expectedArgLength === 1
          ? `one argument`
          : `${argLength} arguments.`

        throw new Error(
          `value-validator: preset "${name}" only accepts ${message}`
        )
      }

      return function (v, callback) {
        const realArgs = [v, ...args, callback]
        return wrapped.apply(this, realArgs)
      }
    })
  }
}


// @returns {Boolean}
function determine_pass (err, pass) {
  return err
    ? false
    : pass === false
      ? false
      : true
}


function default_codec (tester) {
  return tester.split('|')
  .filter((tester) => {
    return !!tester.trim()
  })
  .map((tester) => {

    tester = tester.trim()
    const index = tester.indexOf(':')
    if (!~index) {
      return {
        name: tester,
        args: []
      }
    }

    const name = tester.slice(0, index).trim()
    const args = tester.slice(index + 1)
      .split(',')
      .map((arg) => arg.trim())

    return {
      name,
      args
    }
  })
}


Validator.PRESETS = {}


// Registers a global preset
Validator.registerPreset = (name, method) => {
  if (name in Validator.PRESETS) {
    throw new Error(`value-validator: preset "${name}" defined.`)
  }

  Validator.PRESETS[name] = method
  return Validator
}


Validator.registerPresets = (map) => {
  let key
  for (key in map) {
    Validator.registerPreset(key, map[key])
  }
  return Validator
}


module.exports = Validator
