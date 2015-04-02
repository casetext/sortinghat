The Sorting Hat
===============

The Sorting Hat sorts Firebase events into their Houses.  It accomplishes this through what we shall call magic.

For muggles: This allows you to watch for new children added to a particular Firebase path and invoke a callback function.

    var SortingHat = require('sortinghat'),
        hat = new SortingHat(new Firebase('https://example.firebaseio.com'));
    
    hat.watch('/foo', function(snap) {
        console.log('new foo:', snap.val());
    });

Methods
-------

### `new SortingHat(firebase)`
`require('sortinghat')` gives you this constructor.  Pass in a ready-to-use `Firebase` object.

### `watch(path, [options,] [cb])`
Watch `path` for new children.  In order to not download all the data under this path, Sorting Hat requires you to use a well-defined ordering of data.  You cannot watch for children added at arbitrary locations; they **must** be added to the end of the order.

- `options.order`
  - `key` - Items will be added with keys having a monotonically increasing alpha order.  Suitable for use with `push()`.
  - `priority` - Items will be added with a monotonically increasing priority.
  - *anything else* - Items will be objects containing this key, whose value will monotonically increase (ie a created timestamp).

### `trigger(path, [options,] [cb])`
Watch `path` for new children.  There are no constraints on order, however this requires that the Sorting Hat downloads **all** data from `path`.

When calling a Lambda function, the new child will be automatically deleted from Firebase after Lambda accepts the invocation.

**WARNING!** Only use `trigger` on a path where you plan on deleting the children shortly after they are created.  In other words, `path` should *usually* be empty.  If you ignore this advice, the Sorting Hat will use all your memory and/or crash.

### `responder(path, [options,] [cb])`
Exactly like `trigger` -- watches `path` for new children with no constraints on order (and the associated caveats) -- except adds `/request` to the supplied `path`.

`cb`
----

The `cb` argument to `watch`, `trigger`, and `responder` can optionally take  a callback function.

If you supply a function, it is invoked whenever there is a change.  The one and only argument passed to the function is the Firebase `Snapshot` of the new child.

`watch`, `trigger`, and `responder` also return a `FirebaseWatcher`.  This object is an `EventEmitter` that emits `child_added` events for `watch` and `request` events for `trigger` and `responder`.