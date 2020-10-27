var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();

/* GET home page. */
router.get('/', middleware.auth.loggedIn(), function(req, res, next) {
  
});

module.exports = router;
