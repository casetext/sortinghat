The Sorting Hat
===============

The Sorting Hat sorts Firebase events into their Houses.  It accomplishes this through what we shall call magic.

For muggles: This allows you to watch for new children added to a particular Firebase path and invoke either a callback function or an AWS Lambda function.

Methods
-------

### `init(firebase)`
Before using setting up watchers, you must pass in a `Firebase` instance.

### `watch(path, [options,] cb)`
Watch `path` for new children.  In order to not download all the data under this path, Sorting Hat requires you to use a well-defined ordering of data.  You cannot watch for children added at arbitrary locations; they **must** be added to the end of the order.

- `options.order`
  - `key` - Items will be added with keys having a monotonically increasing alpha order.  Suitable for use with `push()`.
  - `priority` - Items will be added with a monotonically increasing priority.
  - *anything else* - Items will be objects containing this key, whose value will monotonically increase (ie a created timestamp).

### `trigger(path, [options,] cb)`
Watch `path` for new children.  There are no constraints on order, however this requires that the Sorting Hat downloads **all** data from `path`.

When calling a Lambda function, the new child will be automatically deleted from Firebase after Lambda accepts the invocation.

**WARNING!** Only use `trigger` on a path where you plan on deleting the children shortly after they are created.  In other words, `path` should *usually* be empty.  If you ignore this advice, the Sorting Hat will use all your memory and/or crash.

### `responder(path, [options,] cb)`
Exactly like `trigger` -- watches `path` for new children with no constraints on order (and the associated caveats) -- except adds `/request` to the supplied `path`.

### `job(fn[, args])`
Sugar method.  Returns a function that takes a callback and always invokes `fn` with the same `args`.

### `invoke(fn[, args][, cb])`
Invokes an AWS Lambda function named `fn`, passing `args`.  Returns a promise and/or calls `cb` when Lambda accepts the invocation.  Tries 4 times with exponential backoff.

### `prefix`

`invoke()` prefixes the function name passed in with this string.  Useful when you're versioning functions with a prefix.

`cb`
----

The `cb` argument to `watch`, `trigger`, and `responder` can take either a function or a string.

- If you supply a function, it is invoked whenever there is a change.  The one and only argument passed to the function is the Firebase `Snapshot` of the new child.
- If you supply a string, the AWS Lambda function named `cb` is invoked whenever there is a change.  The `data` object (first argument) in the lambda function contains:
  - `path` - the full path to the new child.  ie `https://example.firebaseio.com/some/path/newchild`
  - `key` - the key of the new child.  ie `newchild`
  - `data` - the value of the new child.

Production
----------

Sorting Hat will invoke AWS Lambda functions in AWS if `process.env.NODE_ENV == 'production'`.  Otherwise, it will invoke your lambda functions at `http://localhost:3033`.  Use [locavore](https://www.npmjs.com/package/locavore) to run something that looks like AWS Lambda on your machine.