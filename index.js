'use strict';

const co = require('co');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const util = require('util');
const readline = require('readline');

var logFile = 'done.txt';
var userFile = 'users.txt';
var dataFile = 'data.txt';

function prefixZero(x) {
	let y = x.toString();
	if (x < 10) return "0" + y;
	return y;
}

function getReadStream(filename) {
	return new Promise((resolve, reject) => {
		let readStream = fs.createReadStream(filename);
		readStream.on('error', (e) => reject(e));
		readStream.on('open', () => resolve(readStream));
	});
}

function readDoneFile() {
	return new Promise((resolve, reject) => {
		co(function *() {
			let readStream = yield getReadStream(logFile);
			let rd = readline.createInterface({ input: readStream });
			let done = {};
			rd.on('line', (line) => done[line] = true);
			rd.on('close', () => resolve(done));
		}).catch(onerror);
	});
}

function makequery(param) {
	param['locale'] = 'en';
	param['explicit-lang'] = 'false';
	let date = new Date();
	var datev = date.getFullYear().toString() + prefixZero(date.getMonth() + 1)
		+ prefixZero(date.getDate());
	param['v'] = datev;
	param['limit'] = 197;
	param['m'] = 'foursquare';
	param['wsid'] = 'UMXG1TVJB5TU5FK2THQWZKAITRW1IH';
	param['oauth_token'] = 'QEJ4AQPTMMNB413HGNZ5YDMJSHTOHZHMLZCAQCCLXIX41OMP';
	let url = 'https://api.foursquare.com/v2/users/' + param.id + '/following?' + querystring.stringify(param);
	//console.log(url);
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
				resolve(JSON.parse(data));
			});
			res.on('error', (e) => reject(e));
		}).on('error', (e) => reject(e));
	});
}

function getFollowing(userId) {
	return co(function *() {
		let data = yield makequery({
			id: userId,
			afterMarker: '',
		});
		if (data.meta.code === 200) {
			//console.log(JSON.stringify(data));
			let response = data.response;
			let ids = [];
			for (let item of response.following.items)
				ids.push(item.user.id);
			while (response.moreData) {
				data = yield makequery({
					id: userId,
					afterMarker: response.trailingMarker,
				});
				response = data.response;
				for (let item of response.following.items)
					ids.push(item.user.id);
			}
			let dataStream = fs.createWriteStream(dataFile, { flags: 'a' });
			dataStream.write(userId + ' ' + ids.length);
			for (let id of ids)
				dataStream.write(' ' + id);
			dataStream.end('\n');

			let logStream = fs.createWriteStream(logFile, { flags : 'a' });
			logStream.write(userId);
			logStream.end('\n');
		}
	});
}

co(function *() {
	let done = yield readDoneFile();
	console.log(done);
	let queue = [];
	let userStream = yield getReadStream(userFile);
	let rd = readline.createInterface({ input: userStream });
	rd.on('line', (line) => {
		console.log(line);
		if (queue.length >= 10) {
			console.log('gethere');
			co(function *() {
				console.log(yield Promise.all(queue));
				queue.length = 0;
			});
		} else {
			if (!done[line])
				queue.push(getFollowing(line));
		}
	});
	rd.on('close', () => {
		console.log('' + queue.length + ' left in queue.');
		co(function *() {
			console.log(yield Promise.all(queue));
		});
		queue.length = 0;
	});
});

function onerror(err)  {
	console.error(err.stack);
}
