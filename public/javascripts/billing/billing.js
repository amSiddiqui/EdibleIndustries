const today_np = new NepaliDate(new Date());
const month_start_np = new NepaliDate(
    today_np.getYear(),
    today_np.getMonth(),
    1
);


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

    $('#billing-table thead tr').clone(true).appendTo( '#billing-table thead' );
    $('#billing-table thead tr:eq(1) th').each( function (i) {
        var title = $(this).text();
        $(this).html( '<input type="text" style="width: 100%; padding: 3px; box-sizing: border-box;" class="input is-small" placeholder="Search '+title+'" />' );
 
        $( 'input', this ).on( 'keyup change', function () {
            if ( billingTable.column(i).search() !== this.value ) {
                billingTable
                    .column(i)
                    .search( this.value )
                    .draw();
            }
        } );
    } );

    $('#from_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
        disableAfter: today_np.format("YYYY-MM-DD")
    });

    $('#to_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
        disableAfter: today_np.format("YYYY-MM-DD")
    });

    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
            var min_date = $("#from_date").val();
            if (!validDate(min_date)) {
                min_date = "0/0/0";
            }
            var max_date = $("#to_date").val();
            if (!validDate(max_date)){
                max_date = "99/99/9999";
            }
            var date = data[1];
            min_date = convertNepaliToEnglish(min_date);
            max_date = convertNepaliToEnglish(max_date);
            date = convertNepaliToEnglish(date);
            return dateInRange(date, min_date, max_date);
        }
    );


    var billingTable = $("#billing-table").DataTable({
        "ajax": {
            "url": "/billing/api/bills",
            'dataSrc': 'data'
        },
        "processing": true,
        "language": {
            'loadingRecords': '&nbsp;',
            'processing': `
            <div class="sk-chase">
                <div class="sk-chase-dot"></div>
                <div class="sk-chase-dot"></div>
                <div class="sk-chase-dot"></div>
                <div class="sk-chase-dot"></div>
                <div class="sk-chase-dot"></div>
                <div class="sk-chase-dot"></div>
            </div>
            `
        },
        "createdRow": function(row, data, dataIndex) {
            $(row).attr('onclick', `window.location.href = "/billing/${data.bill_id}"`);
        },
        "columns": [
            {data: 'track_id'},
            {data: 'date'},
            {data: 'name'},
            {data: 'customer_type'},
            {data: 'user'},
            {data: 'total', render: {_: 'display', sort: 'value'}},
            {data: 'total_sold'},
            {data: 'payment_method'},
            {data: 'rented'}
        ],
        "columnDefs": [{
            "width": "3%",
            "targets": 0
        }, {
            "width": "12%",
            "targets": 3
        }],
        "order": [
            [0, 'desc']
        ],
        orderCellsTop: true,
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
                .column(5, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return a + b.value;
                }, 0);
            
            var total = api
                .column(6, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return a + b;
                }, 0);

            costTotal = formatMoney(costTotal);

            // Update footer by showing the total with the reference of the column index 
            $(api.column(0).footer()).html('Total');
            $(api.column(5).footer()).html('Re. '+costTotal);
            $(api.column(6).footer()).html(total);
        }
    });

    $("#from_date, #to_date").on('change', function() {
        billingTable.draw();
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