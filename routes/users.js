var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();

/* GET users listing. */
router.get('/', middleware.auth.loggedIn(), function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
