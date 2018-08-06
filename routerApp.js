var express = require('express');
//var birds = require('./birds');

var app = express();

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
  res.send('hello world')
})

var birds = new express.Router();

if(!birds) {
   throw "www";
}
//var birds = express.Router();
// middleware specific to this router
birds.use(function(req, res, next) {
	  console.log('Time: ', Date.now());
	  next();
	})
	// define the home page route
birds.get('/', function(req, res) {
	  res.send('Birds home page');
	})
	// define the about route
birds.get('/about', function(req, res) {
	  res.send('About birds');
})

app.use('/birds', birds);
	
app.route('/book')
  .get(function(req, res) {
    res.send('Get a random book');
  })
  .post(function(req, res) {
    res.send('Add a book');
  })
  .put(function(req, res) {
    res.send('Update the book');
  })
  
app.listen(8000);