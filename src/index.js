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
    this._add(rule)
    return this
  }

  validate (v, callback) {
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

  // @returns {function()} wrapped
  _add (rule) {
    if (typeof rule === 'string') {
      return this._decodePreset(rule)
    }

    this._rules.push(this._wrapRule(rule))
  }

  _wrapRule (rule) {
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
    .forEach(({name, args}) => {
      const preset = Validator.PRESETS[name]

      if (!preset) {
        throw new Error(`value-validator: unknown preset "${name}".`)
      }

      if (typeof preset === 'function') {
        this._rules.push(this._wrapWithArgs(preset, args))
        return
      }

      // if a preset is a set,
      // then ignore args
      if (util.isArray(preset)) {
        preset.forEach(this._add, this)
      }
    })
  }

  _wrapWithArgs (method, args) {
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
Validator.registerPreset = (name, preset) => {
  if (name in Validator.PRESETS) {
    throw new Error(`value-validator: preset "${name}" defined.`)
  }

  if (typeof preset !== 'function' && !util.isArray(preset)) {
    throw new TypeError(
      `value-validator: preset only accepts function or array.`
    )
  }

  Validator.PRESETS[name] = preset
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
