var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	_ = require('lodash'),
	Q = require('q'),
	aws4 = require('aws4'),
	request = require('request');

var root, defaults = {
	order: 'created'
}, agentPool = {
	maxSockets: 512
};

exports.init = function(firebase) {
	exports.root = root = firebase;
};

var host = 'http://localhost:3033';
if (process.env.PRODUCTION) {
	host = 'https://lambda.us-east-1.amazonaws.com';
}


// things that can go wrong
// - adding an item outside of the expected order = sadness
// - adding the first item to an empty collection (nasty timeout hack?)
// - deleting the last item causes last-1 item to fire again
exports.watch = function(path, options, cb) {
	var watcher = new FirebaseWatcher();
	if (!root) {
		throw new Error('Must init() the sorting hat before calling watch()');
	}
	if (typeof options == 'function' || typeof options == 'string') {
		cb = options;
		options = {};
	}
	if (typeof cb == 'function') {
		watcher.on('child_added', cb);
	} else if (typeof cb == 'string') {
		watcher.on('child_added', function(snap) {
			exports.invoke(cb, {
				key: snap.key(),
				path: snap.ref().toString()
			});
		});
	}
	options = _.assign({ path: path }, defaults, options);

	
	var ref = root.child(path);

	if (options.order == 'key') {
		ref = ref.orderByKey();
	} else if (options.order == 'priority') {
		ref = ref.orderByPriority();
	} else {
		ref = ref.orderByChild(options.order);
	}

	ref = ref.limitToLast(1);

	var first = false;
	ref.on('child_added', function(snap) {
		if (first) {
			watcher.emit('child_added', snap);
		} else {
			first = true;
		}
	});


	return watcher;
};

exports.trigger = function(path, options, cb) {
	var watcher = new FirebaseWatcher();
	if (!root) {
		throw new Error('Must init() the sorting hat before calling trigger()');
	}
	if (typeof options == 'function' || typeof options == 'string') {
		cb = options;
		options = {};
	}
	if (typeof cb == 'function') {
		watcher.on('request', cb);
	} else if (typeof cb == 'string') {
		watcher.on('request', function(snap) {
			exports.invoke(cb, {
				path: path,
				key: snap.key(),
				data: snap.val()
			}, function() {
				snap.ref().set(null);
			});
		});
	}
	options = _.assign({ path: path }, defaults, options);

	var ref = root.child(path);
	ref.on('child_added', function(snap) {
		watcher.emit('request', snap);
	});
};

exports.responder = function(path, options, cb) {
	var watcher = new FirebaseWatcher();
	if (!root) {
		throw new Error('Must init() the sorting hat before calling responder()');
	}
	if (typeof options == 'function' || typeof options == 'string') {
		cb = options;
		options = {};
	}
	if (typeof cb == 'function') {
		watcher.on('request', cb);
	} else if (typeof cb == 'string') {
		watcher.on('request', function(snap) {
			exports.invoke(cb, {
				path: path,
				key: snap.key(),
				data: snap.val()
			}, function() {
				snap.ref().set(null);
			});
		});
	}
	options = _.assign({ path: path }, defaults, options);

	var ref = root.child(path).child('request');
	ref.on('child_added', function(snap) {
		watcher.emit('request', snap);
	});
};

exports.job = function(fn, args) {
	args = args || {};
	return function(cb) {
		return exports.invoke(fn, args, cb);
	};
};

exports.invoke = function(fn, args, cb) {
	var deferred = Q.defer(), tries = 0;
	args = JSON.stringify(args);

	function tryInvoke() {
		var path = '/2014-11-13/functions/' + fn + '/invoke-async/',
			signature = aws4.sign({
				service: 'lambda',
				method: 'POST',
				path: path,
				body: args
			});

		signature.headers['Content-Type'] = 'application/json; charset=utf-8';

		request({
			method: 'POST',
			url: host + path,
			body: args,
			pool: agentPool,
			headers: signature.headers
		}, function(err, res, body) {
			if (err) {
				failed(err);
			} else if (res.statusCode != 202) {
				failed(new Error('Invoke error ' + res.statusCode));
			} else {
				deferred.resolve();
			}
		});
	}

	function failed(err) {
		if (tries++ > 3) {
			deferred.reject(err);
		} else {
			setTimeout(tryInvoke, Math.pow(2, tries) * 1000);
		}
	}

	tryInvoke();
	deferred.promise.nodeify(cb);
	return deferred.promise;
};


function FirebaseWatcher() {
	EventEmitter.call(this);
}
util.inherits(FirebaseWatcher, EventEmitter);
