$(() => {
    $(".delete").on('click', e => {
        $(e.target).parents('.modal').toggleClass('is-active');
        $(e.target).parents('.notification').hide();
    });
    $(".close-modal").on('click', e => {
        $(e.target).parents('.modal').toggleClass('is-active');
    });

    setTimeout(() => {
        $('.notification').animate({
            'margin-top': '-63px'
        }, complete = () => {
            $('.notification').hide();
        });
    }, 4000);

    $(document).on('keypress', 'input,select', function (e) {
        if (e.which == 13) {
            e.preventDefault();
        }
    });
    var nabarShow = false;
    $(".navbar-burger").on('click', function() {
        if (!nabarShow) {
            $("#navMenu").show();
        }else{
            $("#navMenu").hide();
        }
        nabarShow = !nabarShow;
    });
    
});

function formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",") {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.log(e)
    }
};


function warn(msg) {
    $("#warning-message").find('p').html(msg);
    $("#warning-message").show();
}