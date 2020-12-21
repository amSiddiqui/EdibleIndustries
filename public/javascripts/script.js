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

function warn(msg) {
    $("#warning-message").find('p').html(msg);
    $("#warning-message").show();
}