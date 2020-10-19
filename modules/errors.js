module.exports = {
    errorNotFound: (res) => {
        res.render('error-custom', {error_code: '404', error_message: "UH OH! You're lost.", error_description: `The page you are looking for does not exist.
        How you got here is a mystery. But you can click the button below
        to go back to the homepage.`});
    },
    errorDB: (res) => {
        res.render('error-custom', {error_code: '500', error_message: "UH OH! Database Error", error_description: `We encountered some database error. Try again later Or you can click the button below to go back to the homepage.`});
    },
    errorServer: (res) => {
        res.render('error-custom', {error_code: '500', error_message: "UH OH! Server Error", error_description: `We encountered some server error. Try again later Or you can click the button below to go back to the homepage.`});
    }

}