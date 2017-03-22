'use strict'

import make_array from 'make-array'
import util from 'util'

export default class Validator {
  static defaults = ({presets, codec}) => {
    return (rules, options = {}) => {
      if (presets) {
        options.presets = presets
      }

      if (codec) {
        options.codec = codec
      }

      return new Validator(rules, options)
    }
  }

  constructor (rules, {
    codec = default_codec,
    presets = {}
  } = {}) {

    this._codec = codec
    this._presets = presets
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

    console.warn('the callback will be removed in the next major version')
    this._validate(v)
    .then(
      pass => callback(null, pass),
      err => callback(err, false)
    )
  }

  _validate (v) {
    const rules = this._rules

    // if no rules, treat it as success
    if (!rules.length) {
      return Promise.resolve(true)
    }

    const first = rules[0]
    const init = first.call(this._context, v)

    const result = rules.length === 1
      ? init

      : rules.reduce((prev, current, index) => {

        if (index === 0) {
          return prev
        }

        return is_promise_like(prev)
        ? prev
          .then((pass) => {
            if (pass) {
              return current.call(this._context, v)
            }

            return false
          })

        // Not a promise
        : wrap_non_promise_result(prev, current, v)

      }, init)

    return is_promise_like(result)
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
      const preset = this._presets[name]

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
      return method.apply(this, [v, ...args])
    }
  }
}


function is_promise_like (promise) {
  return promise
    && typeof promise.then === 'function'
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
