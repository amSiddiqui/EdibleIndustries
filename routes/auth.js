const express = require('express');
const router = express.Router();

const utility = require('../modules/utility');
const middleware = require('../modules/middleware');
const { route } = require('.');

router.get('/', middleware.auth.notLoggedIn(), (req, res) => {
    res.redirect('/auth/login');
});

router.get('/login', middleware.auth.notLoggedIn(), (req, res) => {
    data = {
        loggin_error : false
    };
    if (req.flash('loggin_error').length != 0) {
        data.loggin_error = true;
        data.loggin_data = req.flash('loggin_data')[0];
    }
    res.render('auth/login', data);
});

router.post('/login', middleware.auth.notLoggedIn(), (req, res) => {

    var email = req.body.email.trim();
    var password = req.body.password.trim();
    utility.user.userExists(email, password).then(data => {
        if (!data.exists) {
            req.flash('loggin_error', true);
            req.flash('loggin_data', {email, password})
            res.redirect('/auth/login');
        }else{
            req.session.loggedin = true;
            req.session.email = email;
            req.session.first_name = data.first_name;
            res.redirect('/');
        }
    }).catch(err => {
        console.log(err);
        res.render('error', {message: 'Database Error', error :{
            status: 500
        }});
    });

});


router.get('/signup', middleware.auth.loggedIn(), (req, res) => {
    data = {
        signup_error: false,
        errors: {}
    };
    var breadcrumbs = [{
        link: '/signup',
        name: 'Add User'
      }
    ];
    data.breadcrumbs = breadcrumbs;
    flashData = req.flash("signup_error");
    if (flashData.length != 0) {
        data.signup_error = true;
        data.errors = flashData[0];
    }
    res.render('auth/signup', data);
});


router.post('/signup', middleware.auth.loggedIn(), (req, res) => {
    var first_name = req.body.first_name.trim();
    var last_name = req.body.last_name.trim();
    var email = req.body.email.trim();
    var password = req.body.password.trim();
    var re_password = req.body.re_password.trim();
    var error = false;
    var error_load = {

    };
    error_load.first_name = first_name;
    error_load.name_error = false;
    error_load.last_name = last_name;
    error_load.email = email;
    error_load.email_error = false;
    error_load.password = password;
    error_load.password_error = false;
    error_load.re_password_error = false;
    if (first_name.length == 0) {
        error = true;
        error_load.name_error = true;
    }
    if (email.length == 0) {
        error = true;
        error_load.email_error = true;
        error_load.email_error_msg = 'Please enter email';
        
    }
    if (password.length < 6) {
        error = true;
        error_load.password_error = true;
        error_load.password_error_msg = 'Password should be atleast 6 characters long';
        
    }
    if (re_password.length == 0) {
        error = true;
        error_load.re_password_error = true;
        error_load.re_password_error_msg = 'Please Confirm Password';
    }
    if (password != re_password) {
        error = true;
        error_load.re_password_error = true;
        error_load.re_password_error_msg = 'Password does not match';
    }

    data = {
        first_name,
        last_name,
        email,
        password
    }
    if (!error) {
        utility.user.createUser(data).then(user => {
            req.flash('flash_message', 'Added User');
            req.flash('flash_color', 'success');
            res.redirect('/');
        }).catch(err => {
            if (err.errors[0].validatorKey == 'not_unique') {
                error = true;
                if (err.errors[0].path == 'users.email') {
                    error_load.email_error = true;
                    error_load.email_error_msg = 'Account already exists';
                }
            }else if (err.errors[0].validatorKey == 'isEmail') {
                error = true;
                error_load.email_error = true;
                error_load.email_error_msg = 'Please enter a valid email';
            }else {
                console.log(err);
                res.render('error', {message: 'Database Error', error :{
                    status: 500
                }});
            }
            if (error) {
                req.flash('signup_error', error_load);
                res.redirect('/auth/signup');        
            }
        });
    }else{
        req.flash('signup_error', error_load);
        res.redirect('/auth/signup');
    }
});

router.get('/logout', middleware.auth.loggedIn(), (req, res) => {
    req.session.loggedin = false;
    req.session.email = null;
    req.session.first_name = null;
    req.session.destroy();
    res.redirect('/');
});


module.exports = router;
