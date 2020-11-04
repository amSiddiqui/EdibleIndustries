$(() => {
    $("#records-table").DataTable({
        "order": [[0, 'desc']]
    });

    $(".return-status").on('mouseenter', function() {
        console.log("mouse over");
        $(this).siblings('.return-history').show();
    });
    $(".return-status").on('mouseleave', function() {
        console.log("mouse leave");
        $(this).siblings('.return-history').hide();
    });

    $("#billing-table").DataTable({
        "columnDefs": [
            { "width": "3%", "targets": 0 },
        ],
        "order": [[0, 'desc']]
    });
});

function returnItem(obj)  {
    var inv_name = $(obj).attr('data-name');
    var inv_id = $(obj).attr('data-invid');
    var bill_id = $(obj).attr('data-billid');
    var tr_id = $(obj).attr('data-trid');
    $("#return-item-modal").find('form').attr('action', '/billing/return/'+tr_id);
    $("#return-item-modal").find('.title').html('Add Return '+inv_name);
    $("#return-item-modal").find('#return-inventory').val(inv_id);
    $("#return-item-modal").find('#return-bill').val(bill_id);
    $("#return-item-modal").addClass('is-active');
}

function confirmPay() {
    $("#confirm-pay").addClass('is-active');
}