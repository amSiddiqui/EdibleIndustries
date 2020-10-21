var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helpers = require('../modules/helpers');


router.get('/image', middleware.auth.loggedIn(), function (req, res, next) {
    var load = req.query.load;
    if (load === '/images/warehouse.svg') {
        res.setHeader('content-disposition', 'inline');
        res.setHeader('filename', path.basename('public' + load));
        res.sendFile(path.resolve('public' + load));
    } else {
        res.setHeader('content-disposition', 'inline');
        res.setHeader('filename', path.basename(load));
        res.sendFile(path.resolve(load));
    }
});

router.post('/image/process', middleware.auth.loggedIn(), function (req, res, next) {
    var tempFolder = Math.floor(10000 + Math.random() * 90000).toString();
    var tempLocation = 'uploads/tmp/' + tempFolder;

    if (!fs.existsSync(tempLocation)) {
        try {
            fs.mkdirSync(tempLocation);
        } catch (error) {
            console.log(error);
        }
    }

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, tempLocation);
        },

        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });

    let upload = multer({
        storage: storage,
        fileFilter: helpers.imageFilter
    }).single('inventory');
    upload(req, res, function (err) {
        if (req.fileValidationError) {
            console.log(req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            console.log(err);
        } else if (err) {
            console.log(err);
        }
        res.setHeader('content-type', 'text/plain');
        req.session.image_id = tempFolder;
        setTimeout(() => {
            if (fs.existsSync(tempLocation)) {
                fs.rmdir(tempLocation, {
                    recursive: true
                });
            }
        }, 15 * 60 * 1000);
        res.send(tempFolder);
        res.end();
    });

});

router.delete('/image/revert', middleware.auth.loggedIn(), function (req, res, next) {
    var image_id = req.session.image_id;
    req.session.image_id = null;
    if (typeof image_id !== 'undefined' && image_id !== null) {
        if (fs.existsSync('uploads/tmp/' + image_id)) {
            fs.rmdir('uploads/tmp/' + image_id, {
                recursive: true
            }, (err) => {
                if (err) {
                    console.log(err);
                }
                res.send('Success');
                res.end();
            });
        }
    }
});

module.exports = router;