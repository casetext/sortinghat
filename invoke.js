var sortinghat = require('./sortinghat');

if (process.argv[0] == 'node') {
	process.argv.shift();
}
var fn = process.argv[1],
	data = JSON.parse(process.argv.slice(2).join(' ') || '{}');

sortinghat.invoke(fn, data, function(err) {
	if (err) {
		console.error(err);
	} else {
		console.log('ok');
	}
});