
const today_np = new NepaliDate(new Date());
var month_start_np = new NepaliDate(
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
        });
    } );

    var billingTable = $("#billing-table").DataTable({
        "ajax": {
            "url": `/billing/api/bills?start=${month_start_np.toJsDate().toISOString()}&end=${today_np.toJsDate().toISOString()}`,
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
            {data: 'user', render: function(data, type, row, meta) {
                if (type === 'filter' || type === 'type' || type === 'sort') {
                    return data.name;
                }
                return `
                    <p class="billing-user-name">${data.name}</p>
                    <p class="billing-warehouse-name">${data.warehouse}</p>
                `;
            }},
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

    function updateDataTable() {
        let start_js = new NepaliDate($("#from_date").val()).toJsDate();
        let end_js = new NepaliDate($("#to_date").val()).toJsDate();
        billingTable.ajax.url(`/billing/api/bills?start=${start_js.toISOString()}&end=${end_js.toISOString()}`).load();
    }


    if ($("#return_date").length)
        $('#return_date').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
        });

    if ($("#pay_date").length)
        $('#pay_date').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
        });


    if ($("#from_date").length)
    $('#from_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
        disableAfter: today_np.format("YYYY-MM-DD"),
        onChange: updateDataTable
    });

    $("#from_date").val( month_start_np.format("DD/MM/YYYY"));
    
    $("#from_date + .clear-button").off("click");
    $("#from_date + .clear-button").on("click", function() {
        $("#from_date").val( month_start_np.format("DD/MM/YYYY"));
        updateDataTable();
    });

    if ($("#to_date").length)
    $('#to_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
        disableAfter: today_np.format("YYYY-MM-DD"),
        onChange: updateDataTable
    });

    $("#to_date").val( today_np.format("DD/MM/YYYY") );

    $("#to_date + .clear-button").off("click");
    $("#to_date + .clear-button").on("click", function() {
        $("#to_date").val( today_np.format("DD/MM/YYYY"));
        updateDataTable();
    });
    
    $.get('/api/warehouse/all', function(warehouse){
        $.get('/api/users/all', function(users) {
            if (isNaN(warehouse_id) || isNaN(user_id)) {
                $("#edit-warehouse-text").html("Error Occurred, try again later");    
                console.log("Returned part 1");
                return;
            }

            if (!warehouse || !warehouse.warehouses) {
                $("#edit-warehouse-text").html("Error Occurred, try again later");    
                console.log("Returned part 2");
                return;
            }

            if (!users) {
                $("#edit-warehouse-text").html("Error Occurred, try again later");    
                console.log("Returned part 3");
                return;
            }

            let warehouses = warehouse.warehouses;
            users = users;

            $("#edit-warehouse-select").find('option').remove(); 

            for (let w of warehouses) {
                if (w.id == warehouse_id) {
                    $("#edit-warehouse-select").append(`<option disabled selected value="${w.id}">${w.name}</option>`);
                } else {
                    $("#edit-warehouse-select").append(`<option value="${w.id}">${w.name}</option>`);
                }
            }

            $("#edit-user-select").find('option').remove(); 
            for (let u of users) {
                if (u.email === 'gt_ams@yahoo.in') continue;
                if (u.id == user_id) {
                    $("#edit-user-select").append(`<option disabled selected value="${u.id}">${u.first_name} ${u.last_name}</option>`);
                } else {
                    $("#edit-user-select").append(`<option value="${u.id}">${u.first_name} ${u.last_name}</option>`);
                }
            }

            $("#edit-warehouse-form").show();
        }).fail(function(err) {
            console.log(err);
            $("#edit-warehouse-text").html("Error Occurred, try again later");
        });
    }).fail(function(err) {
        console.log(err);
        $("#edit-warehouse-text").html("Error Occurred, try again later");
    });

    $("#edit-warehouse").on('click', function() {
        $("#edit-warehouse-modal").addClass('is-active');
    });

    $("#edit-user-select").on('change', function() {
        $("#edit-warehouse-button").attr('disabled', false);
    });
    
    $("#edit-warehouse-select").on('change', function() {
        let w_id = $(this).val();
        $("#edit-warehouse-button").attr('disabled', true);
        $.ajax({
            url: '/billing/api/check-warehouse-edit',
            data: {warehouse: w_id, bill: bill_id},
            success: function(res) {
                if (res.valid) {
                    $("#edit-warehouse-button").attr('disabled', false);
                    $("#warehouse-error-message").html('');
                } else {
                    $("#warehouse-error-message").html(res.message);
                }
            },
            error: function (xhr, statusText, status) {
                console.log(err);
                $("#warehouse-error-message").html('Some error occurred try again later');
            }
        });

    })

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