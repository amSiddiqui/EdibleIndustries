function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

$(document).ready(function() {
    $("#rates-tabs-link").click(function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#rates-tab").show();
    });

    $("#records-tabs-link").click(function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#records-tab").show();
    });

    $("#bill-tabs-link").click(function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#bill-tab").show();
    });
});