'use strict';
let mysql = require('mysql');
let Promise = require('bluebird');
let config = require('./config.json');

let RDS = {};
let Processor = {};

Processor.process = (condition, action) => {
	var resolver = Promise.defer();

	var loop = function() {
		if (!condition()) return resolver.resolve();
		return Promise.cast(action())
			.then(loop)
			.catch(resolver.reject);
	};

	process.nextTick(loop);

	return resolver.promise;
};

RDS.initializeConnection = () => {
	Processor.connection = mysql.createConnection({
	  host	 : config.mysql.host, 
	  user	 : config.mysql.username, 
	  password : config.mysql.pass, 
	  database : config.mysql.db,
	  port     : config.mysql.port
	});
	Processor.connection.connect((err) => {
		if (err)
			console.error("couldn't connect",err);
		else
			console.log("mysql connected");
	});
};

RDS.disconnect = () => {
	Processor.connection.end((err) => {
		console.log("Disconnect.");
	});
};

RDS.execute = (event, callback) => {
	Processor.connection.query(event.sql, event.params, (err, info) => {
		let response = {};
		response.data = info;
		response.message = "OK";
		if(!err) {
			response.code = 200;
		} else {
			response.code = 500;
		}

		callback(err, response);
	});
};

RDS.executeMulti = (event, callback) => {
	var sum = 0, stop = event.queries.length;
	Processor.process(function() {
		return sum < stop;
	}, () => {
		return new Promise(function(resolve, reject) {

			Processor.connection.query(event.queries[sum].sql, event.queries[sum].params, (err, info) => {
				var response = {};
				response.data = info;
				response.message = "OK";
				if(!err) {
					response.code = 200;
				} else {
					response.code = 500;
				}
				sum++;
				if(sum == event.queries.length) {
					callback(err, response);
				}
				resolve();
			});
		});
	}).then(() => {
		console.log("Done");
	});
};

exports.handler = (event,context) =>{
	console.log('Received event:');
	console.log(JSON.stringify(event, null, '  '));
	RDS.initializeConnection();
	if(event.queries && event.queries.length) {	
		RDS.executeMulti(event, (err, info) => {
			RDS.disconnect();
			if(!err) {
				context.succeed(JSON.stringify(info, null, '  '));
			} else {
				context.fail("/err: "+err);
			}
		});
	} else {
		RDS.execute(event, (err, info) => {
			RDS.disconnect();
			if(!err) {
				context.succeed(JSON.stringify(info, null, '  '));
			} else {
				context.fail("/err: "+err);
			}
		});
	}
};

