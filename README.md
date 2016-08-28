[![Build Status](https://travis-ci.org/kaelzhang/value-validator.svg?branch=master)](https://travis-ci.org/kaelzhang/value-validator)
<!-- optional appveyor tst
[![Windows Build Status](https://ci.appveyor.com/api/projects/status/github/kaelzhang/value-validator?branch=master&svg=true)](https://ci.appveyor.com/project/kaelzhang/value-validator)
-->
<!-- optional npm version
[![NPM version](https://badge.fury.io/js/value-validator.svg)](http://badge.fury.io/js/value-validator)
-->
<!-- optional npm downloads
[![npm module downloads per month](http://img.shields.io/npm/dm/value-validator.svg)](https://www.npmjs.org/package/value-validator)
-->
<!-- optional dependency status
[![Dependency Status](https://david-dm.org/kaelzhang/value-validator.svg)](https://david-dm.org/kaelzhang/value-validator)
-->

# value-validator



## Install

```sh
$ npm install value-validator --save
```

## Usage

```js
const Validator = require('value-validator')
const validator = new Validator([
  /.{4,}/,
  /^[a-z0-9_]+$/i,
  function (v) {
    const done = this.async()
    asyncCheckExists(v, exists => {
      if (exists) {
        return done(new Error(`username "${v}" already exists.`))
      }

      done(null)
    })
  }
])

validator.validate('foo', (err, pass) => {
  err  // null
  pass // false, to short
})

validator.validate('foo.bar', (err, pass) => {
  err  // null
  pass // false, only letters, numbers and underscores.
})

validator.validate('steve', (err, pass) => {
  err  // maybe `new Error('username "steve" already exists.')`
  pass // false
})

validator.validate('cook', (err, pass) => {
  // maybe "cook" is a valid username
  err  // null
  pass // true
})
```

## new Validator(rule, options)

- **rule** `RegExp|function()|String|Array.<mixed>` rule could be a regular expression, a function, a string (validator preset), or an array of mixed-type of the former three.

### Sync Function-type `rule`

The function should accept only one argument, which is the value to be validated.

If the function returns a `Boolean`, it indicates whether the validation is passed, and the `err` will be `null`

```js
const validator = new Validator(v => v > 10)
validator.validate(5, (err, pass) => {
  err // null
  pass // false
})
```

If the function returns an `Error`, it means the validation fails, and the error will passed to the callback function of `validate(v, callback)` as the first parameter `err`.

```js
const validator = new Validator(v => {
  if (v > 10) {
    return true
  }

  return new Error('should larger than 10')
})
validator.validate(5, (err, pass) => {
  err // new Error('should larger than 10')
  pass // false
})
```

### Async validator

To define an asynchronous validator, we need to use the common [this.async()](https://www.npmjs.com/package/wrap-as-async) style.

See the first example.

## Validator Presets

Validator presets are pre-defined abbreviation of a certain validation, or a set of validations.

```js
Validator.registerPresets({
  // To define a function-typed preset
  unique: function (v) {
    const done = this.async()
    asyncCheckExists(v, exists => {
      if (exists) {
        return done(new Error(`username "${v}" already exists.`))
      }

      done(null)
    })
  },

  min4: /.{4,}/,

  // A preset could be a set of presets.
  username: [
    'min4',
    /^[a-z0-9_]+$/i,
    'unique'
  ]
})

// Then we could use `username` as the test rule.
const validator = new Validator('username')
```

## License

MIT
