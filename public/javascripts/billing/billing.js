$(() => {
    $("#records-table").DataTable({
        "order": [
            [0, 'desc']
        ]
    });

    $(".return-status").on('mouseenter', function () {
        console.log("mouse over");
        $(this).siblings('.return-history').show();
    });
    $(".return-status").on('mouseleave', function () {
        console.log("mouse leave");
        $(this).siblings('.return-history').hide();
    });

    $("#billing-table").DataTable({
        "columnDefs": [{
            "width": "3%",
            "targets": 0
        }, ],
        "order": [
            [0, 'desc']
        ],
        "footerCallback": function (row, data, start, end, display) {
            var api = this.api(),
                data;
            var intVal = function (i) {
                if (typeof i === 'string') {
                    i = i.trim();
                    if (i.length == 0) {
                        return 0;
                    }
                    if (isNaN(i)) {
                        i = i.substring(3);
                        return parseFloat(i);
                    }
                    return parseFloat(i);
                }
                return i;
            };

            // computing column Total of the complete result 
            var costTotal = api
                .column(4)
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            var total = api
                .column(5)
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            costTotal = formatMoney(costTotal);

            // Update footer by showing the total with the reference of the column index 
            $(api.column(0).footer()).html('Total');
            $(api.column(4).footer()).html('Re. '+costTotal);
            $(api.column(5).footer()).html(total);
        }
    });
    $('#return_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true,
    });

    $('#pay_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true,
    });
});

function returnItem(obj) {
    var inv_name = $(obj).attr('data-name');
    var inv_id = $(obj).attr('data-invid');
    var bill_id = $(obj).attr('data-billid');
    var tr_id = $(obj).attr('data-trid');
    var remaining = $(obj).attr('data-remain');
    $("#return-item-modal").find('form').attr('action', '/billing/return/' + tr_id);
    $("#return-item-modal").find('.title').html('Add Return ' + inv_name);
    $("#return-item-modal").find('#return-inventory').val(inv_id);
    $("#return-item-modal").find('#return-bill').val(bill_id);
    $("#return-item-modal").find('#return_quantity').val(remaining);
    $("#return-item-modal").find('#return_quantity').attr('max', remaining);

    $("#return-item-modal").addClass('is-active');
}

function confirmPay() {
    $("#confirm-pay").addClass('is-active');
}

function confirmDelete() {
    $("#confirm-delete").addClass('is-active');
}