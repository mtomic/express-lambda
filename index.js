'use strict';
let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser')
let mysql = require('./_mysqlproxy/index');
let app = express();
let response = null;
let context = {};

context.succeed = (obj) => {
	response.send(obj);
};
context.fail = (obj) => {
	response.send(obj);
};

app.use(cors());
app.use(bodyParser.json());

app.get('/ping', (req, res) => {
  res.send('Ping received');
});

/** Sample Lambda Functions **/
app.get('/mysql', (req, res) => {
  response = res;
  var event = {};
  event.sql = "SELECT * FROM user WHERE Host = ?";
  event.params = ['localhost'];
  mysql.handler(event, context);
});

app.post('/echo', (req, res) => {
  response = res;
  var sample = require('./_echo/index');
  sample.handler(req.body, context);
});

app.listen(3000, () => {
  console.log('Listening on port 3000!');
});