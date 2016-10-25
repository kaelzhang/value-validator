'use strict'

import make_array from 'make-array'
import util from 'util'


class Validator {
  static PRESETS = {}

  // Registers a global preset
  static registerPreset = (name, preset) => {
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

  static registerPresets = (map) => {
    for (const key in map) {
      Validator.registerPreset(key, map[key])
    }

    return Validator
  }

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
    if (!callback) {
      return this._validate(v)
    }

    this._validate(v)
    .then((pass) => {
      callback(null, pass)
    })
    .catch((err) => {
      callback(err, false)
    })
  }

  _validate (v) {
    // if no rules, treat it as success
    if (!this._rules.length) {
      return Promise.resolve(true)
    }

    const rules = [].concat(this._rules)
    const first = rules.pop()

    const result = rules.length
      ? rules.reduce((prev, current) => {
        return prev instanceof Promise
        ? prev
          .then((pass) => {
            if (pass) {
              return current(v)
            }

            return false
          })

        // Not a promise
        : wrap_non_promise_result(prev, current)

      }, first(v))

      : first(v)

    return result instanceof Promise
      ? result
      : wrap_non_promise_result(result)
  }

  // @returns {function()} wrapped
  _add (rule) {
    if (typeof rule === 'string') {
      return this._decodePreset(rule)
    }

    this._rules.push(this._wrapRule(rule))
  }

  // returns `function()`
  _wrapRule (rule) {
    if (typeof rule === 'function') {
      return rule
    }

    if (util.isRegExp(rule)) {
      return (v) => rule.test(v)
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

    if (expectedArgLength !== args.length) {
      const message = expectedArgLength === 1
        ? `one argument`
        : `${argLength} arguments.`

      throw new Error(
        `value-validator: preset "${name}" only accepts ${message}`
      )
    }

    return function (v) {
      return method.call(this, v, ...args)
    }
  }
}


function wrap_non_promise_result (result, next, v) {
  return result instanceof Error
    // If returns an error, then reject
    ? Promise.reject(result)
    // else, as a result
    : result
      // Success
      ? next
        // If has next, then go to next validator
        ? next(v)
        // else, as success
        : Promise.resolve(true)
      // Failure
      : Promise.resolve(false)
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

export default Validator
