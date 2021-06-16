const express = require('express');
const router = express.Router();

const utility = require('../modules/utility');
const middleware = require('../modules/middleware');
const {
    route
} = require('.');

router.get('/', middleware.auth.notLoggedIn(), (req, res) => {
    res.redirect('/auth/login');
});

router.get('/login', middleware.auth.notLoggedIn(), (req, res) => {
    data = {
        loggin_error: false
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
            req.flash('loggin_data', {
                email,
                password
            })
            res.redirect('/auth/login');
        } else {
            req.session.loggedin = true;
            req.session.email = email;
            req.session.first_name = data.first_name;
            req.session.user_type = data.user_type;
            utility.user.getWarehouse().then(warehouse => {
                if (warehouse)
                    req.session.warehouse = warehouse.id;
            });
            res.redirect('/');
        }
    }).catch(err => {
        console.log(err);
        res.render('error', {
            message: 'Database Error',
            error: {
                status: 500
            }
        });
    });

});


router.get('/signup', middleware.auth.loggedIn(), (req, res) => {
    if (!utility.misc.checkPermission(req, res, 'Only Admin user allowed to add user accounts'))
        return;
    data = {
        signup_error: false,
        errors: {}
    };
    var breadcrumbs = [{
            link: '/auth/users',
            name: 'Users'
        },
        {
            link: '/auth/signup',
            name: 'Add User'
        }
    ];
    data.breadcrumbs = breadcrumbs;

    var flashData = req.flash("signup_error");
    if (flashData.length != 0) {
        data.signup_error = true;
        data.errors = flashData[0];
    }
    utility.warehouse.fetchWarehouses().then(warehouses => {
        data.warehouses = warehouses;
        res.render('auth/signup', data);
    });
});

router.get('/users', middleware.auth.loggedIn(), (req, res) => {
    // Only alow if user type is admin
    if (!utility.misc.checkPermission(req, res, 'Only Admin user allowed to add user accounts'))
        return;

    var breadcrumbs = [{
        link: '/auth/users',
        name: 'Users'
    }];

    var data = {
        dependency: '/auth/users.js',
        breadcrumbs
    };

    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');
    if (flash_message.length !== 0 && flash_color.length !== 0) {
        data.flash_message = flash_message;
        data.flash_color = flash_color;
    }

    utility.user.fetchAll().then((users) => {
        data.users = users;
        res.render('auth/users', data);
    }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Error fetching users');
        req.flash('flash_color', 'danger');
        res.redirect('/');
    });

});

router.get('/users/edit/:id', middleware.auth.loggedIn(), (req, res) => {
    // Only alow if user type is admin
    if (!utility.misc.checkPermission(req, res, 'Only Admin user allowed to add user accounts'))
        return;

    let id = parseInt(req.params.id);
    var breadcrumbs = [{
            link: '/auth/users',
            name: 'Users'
        },
        {
            link: '/auth/edit/'+id,
            name: 'Edit User'
        }
    ];

    var data = {
        dependency: '/auth/user-edit.js',
        breadcrumbs,
        signup_error: false,
        errors: {}
    };

    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');
    if (flash_message.length !== 0 && flash_color.length !== 0) {
        data.flash_message = flash_message;
        data.flash_color = flash_color;
    }
    var flashData = req.flash("signup_error");
    if (flashData.length != 0) {
        data.signup_error = true;
        data.errors = flashData[0];
    }

    utility.user.fetch(id).then((user) => {
        utility.warehouse.fetchWarehouses().then(warehouses => {
            data.warehouses = warehouses;
            data.user = user;
            res.render('auth/user-edit', data);
        }).catch(err => {
            throw err;
        });
    }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Error opening user');
        req.flash('flash_color', 'danger');
        res.redirect('/auth/users');
    });
});

router.put('/users/:id', middleware.auth.loggedIn(), (req, res) => {
    if (!utility.misc.checkPermission(req, res, 'Only Admin user allowed to add user accounts'))
        return;
    
    let id = parseInt(req.params.id);
    var first_name = req.body.first_name.trim();
    var last_name = req.body.last_name.trim();
    var email = req.body.email.trim();
    var password = req.body.password.trim();
    var re_password = req.body.re_password.trim();
    var user_type = req.body.user_type;
    var warehouse = req.body.warehouse;
    var change_password = utility.misc.toNumber(req.body.change_password);
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
    if (change_password === 1 && password.length < 6) {
        error = true;
        error_load.password_error = true;
        error_load.password_error_msg = 'Password should be atleast 6 characters long';

    }
    if (change_password === 1 && re_password.length == 0) {
        error = true;
        error_load.re_password_error = true;
        error_load.re_password_error_msg = 'Please Confirm Password';
    }
    if (change_password === 1 && password != re_password) {
        error = true;
        error_load.re_password_error = true;
        error_load.re_password_error_msg = 'Password does not match';
    }

    var data = {
        first_name,
        last_name,
        email,
        password,
        user_type,
        change_password,
        warehouse
    };

    if (!error) {
        utility.user.editUser(id, data).then(user => {
            req.flash('flash_message', 'Saved User');
            req.flash('flash_color', 'success');
            res.redirect('/auth/users');
        }).catch(err => {
            if (err.errors[0].validatorKey == 'not_unique') {
                error = true;
                if (err.errors[0].path == 'users.email') {
                    error_load.email_error = true;
                    error_load.email_error_msg = 'Account already exists';
                }
            } else if (err.errors[0].validatorKey == 'isEmail') {
                error = true;
                error_load.email_error = true;
                error_load.email_error_msg = 'Please enter a valid email';
            } else {
                console.log(err);
                req.flash('flash_message', 'Error Saving user');
                req.flash('flash_color', 'danger');
                res.redirect('/auth/users');
            }
            if (error) {
                req.flash('signup_error', error_load);
                res.redirect('/auth/users/edit/'+id);
            }
        });
    } else {
        req.flash('signup_error', error_load);
        res.redirect('/auth/users/edit/'+id);
    }
});

router.post('/signup', middleware.auth.loggedIn(), (req, res) => {
    if (!utility.misc.checkPermission(req, res, 'Only Admin user allowed to add user accounts'))
        return;

    var first_name = req.body.first_name.trim();
    var last_name = req.body.last_name.trim();
    var email = req.body.email.trim();
    var password = req.body.password.trim();
    var re_password = req.body.re_password.trim();
    var warehouse = req.body.warehouse;
    var user_type = req.body.user_type;
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

    var data = {
        first_name,
        last_name,
        email,
        password,
        user_type,
        warehouse
    }
    if (!error) {
        utility.user.createUser(data).then(() => {
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
            } else if (err.errors[0].validatorKey == 'isEmail') {
                error = true;
                error_load.email_error = true;
                error_load.email_error_msg = 'Please enter a valid email';
            } else {
                console.log(err);
                req.flash('flash_message', 'Error Saving user');
                req.flash('flash_color', 'danger');
                res.redirect('/auth/users');
            }
            if (error) {
                req.flash('signup_error', error_load);
                res.redirect('/auth/signup');
            }
        });
    } else {
        req.flash('signup_error', error_load);
        res.redirect('/auth/signup');
    }
});

router.get('/logout', middleware.auth.loggedIn(), (req, res) => {
    req.session.loggedin = false;
    req.session.email = null;
    req.session.first_name = null;
    req.session.user_type = null;
    req.session.warehouse = null;
    req.session.destroy();
    res.redirect('/');
});


module.exports = router;