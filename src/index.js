'use strict'

const make_array = require('make-array')
const wrap = require('wrap-as-async')
const async = require('async')

const util = require('util')


class Validator {
  constructor (rules, {
    codec = default_codec
  } = {}) {

    this._codec = codec
    this._presets = {}
    this._context = null
    this._rules = []

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
      tester.call(this.context, v, done)
    }, (err, pass) => {
      if (err) {
        return callback(err, false)
      }

      if (!pass) {
        return callback(true, false)
      }

      callback(null, true)
    })
  }

  registerPreset (name, method) {
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
      return wrap(fule)
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
    return this.codec(rule)
    .map(({name, args}) => {
      const method = this._presets[name] || Validator.PRESETS[name]

      if (!method) {
        throw new Error(`value-validator: unknown preset "${name}".`)
      }

      // The first argument is the value
      const argLength = method.length - 1
      const wrapped = wrap(method)

      if (argLength !== args.length) {
        throw new Error(`value-validator: preset "${name}" only accepts ${argLength} arguments.`)
      }

      return function (v, callback) {
        const realArgs = [v, ...args, callback]
        return wrapped.apply(this, realArgs)
      }
    })
  }
}


function default_codec (tester) {
  return tester.split('|').map((tester) => {
    tester = tester.trim()

    const splitted = tester.split(':')
    const args = splitted[1]
      .join(':')
      .split(',')
      .map((arg) => arg.trim())
    const method = splitted[0]

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


module.exports = Validator
