var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	_ = require('lodash');

var root, defaults = {
	order: 'created'
};

function SortingHat(firebase) {
	if (!(this instanceof SortingHat)) {
		return new SortingHat(firebase);
	}
	if (!firebase || !firebase.root) {
		throw new Error('Must provide the sorting hat with a Firebase reference');
	}
	this.root = firebase;
}

exports = module.exports = SortingHat;


// things that can go wrong
// - adding an item outside of the expected order = sadness
// - adding the first item to an empty collection (nasty timeout hack?)
// - deleting the last item causes last-1 item to fire again
SortingHat.prototype.watch = function(path, options, cb) {
	var watcher = new FirebaseWatcher();
	
	if (typeof options == 'function' || typeof options == 'string') {
		cb = options;
		options = {};
	}
	if (typeof cb == 'function') {
		watcher.on('child_added', cb);
	}

	options = _.assign({ path: path }, defaults, options);

	
	var ref = this.root.child(path);

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

SortingHat.prototype.trigger = function(path, options, cb) {
	var watcher = new FirebaseWatcher();
	
	if (typeof options == 'function' || typeof options == 'string') {
		cb = options;
		options = {};
	}
	if (typeof cb == 'function') {
		watcher.on('request', cb);
	}

	options = _.assign({ path: path }, defaults, options);

	var ref = this.root.child(path);
	ref.on('child_added', function(snap) {
		watcher.emit('request', snap);
	});
};

SortingHat.prototype.responder = function(path, options, cb) {
	var watcher = new FirebaseWatcher();
	
	if (typeof options == 'function' || typeof options == 'string') {
		cb = options;
		options = {};
	}
	if (typeof cb == 'function') {
		watcher.on('request', cb);
	}

	options = _.assign({ path: path }, defaults, options);

	var ref = this.root.child(path).child('request');
	ref.on('child_added', function(snap) {
		watcher.emit('request', snap);
	});
};


function FirebaseWatcher() {
	EventEmitter.call(this);
}
util.inherits(FirebaseWatcher, EventEmitter);
