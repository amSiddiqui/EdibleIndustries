$(() => {
    $('#change-password-button').on('click', function() {
        var change = $("#change-password").val();
        if (change == 0) {
            $(".password-fields").show();
            $("#change-password").val(1);
            $(this).removeClass('is-success');
            $(this).addClass('is-danger');
            $(this).html("Don't change password");
        } else {
            $(".password-fields").hide();
            $("#change-password").val(0);
            $(this).removeClass('is-danger');
            $(this).addClass('is-success');
            $(this).html("Change password");
        }
    });
});