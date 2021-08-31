function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

const today_np = new NepaliDate(new Date());
var month_start_np = new NepaliDate(
    today_np.getYear(),
    today_np.getMonth(),
    1
);
var warehouses = []; 
$.get('/api/warehouse/all', function(data) {
    warehouses = data.warehouses;
    for (let i = 0; i < warehouses.length; i++) {
        var w = warehouses[i];
        if (w.id != warehouse_id)
            $("#inventory_warehouse").append(`<option value="${w.id}">${w.name}</option>`);
    }
});

function recordEdit(
    date,
    type,
    cost,
    packing,
    quantity,
    record_id,
    user_id
) {
    $("#edit-inventory-type").val(type);
    var nepali_date = convertEnglishToNepali(date);
    $("#edit_record_date").val(nepali_date);
    $("#edit_inventory_cost").val(cost);
    $("#edit-inv-batch").val(packing);
    $("#edit-quantity").val(quantity);
    $("#edit-inventory-record-modal").find('form').attr('action', '/inventory/edit/'+record_id+'?_method=PUT');
    $("#edit_inventory_user").val(user_id);
    $("#edit-inventory-record-modal").addClass('is-active');
}

function recordDelete(id) {
    $("#confirm-delete-record").find("#delete-record-id").val(id);
    $("#confirm-delete-record").addClass('is-active');
}

function fetchAndUpdateReport() {
    $("#report-message").show();
    var from = $("#report-date-from").val();
    var to = $("#report-date-to").val();
    
    $.post('/api/inventory/report/'+inventory_id,{from, to}, function(data) {
        $("#report-message").html(data.message);
        
        if (data.status == 'success') {
            $("#report-message").removeClass('has-text-danger');
            $("#report-message").addClass('has-text-success');
        }else {
            $("#report-message").addClass('has-text-danger');
            $("#report-message").removeClass('has-text-success');
        }
    }).fail(function(err) {
        console.log("Some error occurred");
        console.log(err);
    });
}

$(function () {

    // Check if fragment in the url is present
    if (window.location.hash) {
        var hsh = window.location.hash;
        switch(hsh) {
            case "#history":
                resetTabs();
                $("#history-tabs-link").addClass('is-active');
                $("#history-tab").show();
                break;
            case "#reports":
                resetTabs();
                $("#reports-tabs-link").addClass('is-active');
                $("#reports-tab").show();
                break;
            case "#bills":
                resetTabs();
                $("#bill-tabs-link").addClass('is-active');
                $("#bill-tab").show();
                break;
            case "#batches":
                resetTabs();
                $("#batches-tabs-link").addClass('is-active');
                $("#batches-tab").show();
                break;
        }
    }


    $(".add-inventory-record").on('click', function () {
        $('#add-inventory-record-modal').addClass('is-active');
    });
    $("#history-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#history-tab").show();
        window.location.hash = "history";
    });

    $("#reports-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#reports-tab").show();
        window.location.hash = "reports";
    });

    $("#batches-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#batches-tab").show();
        window.location.hash = "batches";
    });

    $("#bill-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#bill-tab").show();
        window.location.hash = "bills";
    });

    
    var billingTable = $("#billing-table").DataTable({
        "ajax": {
            "url": `/inventory/api/${inventory_id}/bills?start=${month_start_np.toJsDate().toISOString()}&end=${today_np.toJsDate().toISOString()}`,
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
            {data: 'nepali_date'},
            {data: 'customer_name'},
            {data: 'customer_type'},
            {data: 'user'},
            {data: 'inv_total'},
            {data: 'total_items'},
            {data: 'payment_method'},
            {data: 'rent_status'}
        ],
        "columnDefs": [{
            "width": "3%",
            "targets": 0
        }, ],
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
                    return intVal(a) + intVal(b);
                }, 0);

            var total = api
                .column(6, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            costTotal = formatMoney(costTotal);

            // Update footer by showing the total with the reference of the column index 
            $(api.column(0).footer()).html('Total');
            $(api.column(5).footer()).html('Re. '+costTotal);
            $(api.column(6).footer()).html(total);
        }
    });

    if ($("#from_date_billing").length) {
        $('#from_date_billing').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
            disableAfter: today_np.format("YYYY-MM-DD"),
            onChange: updateDataTable
        });
        $("#from_date_billing").val( month_start_np.format("DD/MM/YYYY"));
        $("#from_date_billing + .clear-button").off("click");
        $("#from_date_billing + .clear-button").on("click", function() {
            $("#from_date_billing").val( month_start_np.format("DD/MM/YYYY"));
            updateDataTable();
        });
    }

    if ($("#to_date_billing").length) {
        $('#to_date_billing').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
            disableAfter: today_np.format("YYYY-MM-DD"),
            onChange: updateDataTable
        });
        $("#to_date_billing").val( today_np.format("DD/MM/YYYY") );
        
        $("#to_date_billing + .clear-button").off("click");
        $("#to_date_billing + .clear-button").on("click", function() {
            $("#to_date_billing").val( today_np.format("DD/MM/YYYY"));
            updateDataTable();
        });
    }

    function updateDataTable() {
        let start_js_val = $("#from_date_billing").val();
        let end_js_val = $("#to_date_billing").val();
        let start = new NepaliDate(start_js_val);
        let end = new NepaliDate(end_js_val);
        billingTable.ajax.url(`/inventory/api/${inventory_id}/bills?start=${start.toJsDate().toISOString()}&end=${end.toJsDate().toISOString()}`).load();
    }


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

    var history_table_columns = [
        {data: 'id'},
        {data: 'user_info', render: function(data, type, row, meta) {
            if (type === 'filter' || type === 'sort') {
                return data.name;
            }
            let html = data.name;
            if (data.type === 'sold') {
                html += `<div class="has-text-success bill-id-show"><p>${data.bill_id}</p></div>`;
            }
            return html;
        }},
        {data: 'packing'},
        {data: 'type_info', render: function(data, type, row, meta) {
            return data.type
        }, createdCell: function(cell, cellData, rowData, rowIndex, colIndex) {
            $(cell).addClass('is-capitalized');
            let color_class = '';
            if (cellData.color === 'success') {
                color_class = 'has-text-success';   
            }
            if (cellData.color === 'danger') {
                color_class = 'has-text-danger';
            }
            $(cell).addClass(color_class);
        }},
        {data: 'quantity'},
        {data: 'cost'},
        {data: 'nepali_date'},
    ];

    if (has_perm) {
        history_table_columns.push({
            data: 'edit_data',
            render: function(record, type, row, meta) {
                if (type === 'filter' || type === 'sort') {return '';}
                if(record.type == 'discarded' || record.type == 'purchased' || record.type == 'manufactured' || record.type == 'transferred') {
                    return `
                    <div class="field is-grouped">
                        <div class="control">
                            <button
                            onclick = "recordEdit(
                                '${record.date}',
                                '${record.type}',
                                '${record.cost}',
                                '${record.batch_id}',
                                '${record.quantity}',
                                '${record.id}',
                                '${record.user_id}',
                                '${record.user_name}',
                            );"
                            class="record-edit-button type-edit-button has-text-info"><i
                                    class="fas fa-pen"></i></button>
                        </div>
                        <div class="control">
                            <button class="record-delete-button type-delete-button has-text-danger"
                            onclick = "recordDelete(
                                '${record.id}'
                            );"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    `;
                }
                return '';
            }
        });
    }

    var historyTable = $("#history-table").DataTable({
        "ajax": {
            "url": `/inventory/api/${inventory_id}/history?start=${month_start_np.toJsDate().toISOString()}&end=${today_np.toJsDate().toISOString()}`,
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
            if (data.type === 'sold') {
                $(row).addClass('bill-id-show-container');
            }
        },
        "order": [
            [0, 'desc']
        ],
        "columns": history_table_columns,
        "footerCallback": function (row, data, start, end, display) {
            var api = this.api();
            var intVal = function (i) {
                if (typeof i === 'string') {
                    i = i.trim();
                    if (i.length == 0) {
                        return 0;
                    }
                    if (isNaN(i)) {
                        i = i.split(')')[1];
                        return parseFloat(i);
                    }
                    return parseFloat(i);
                }
                return i;
            };

            // computing column Total of the complete result 
        
            var total = api
                .column(4, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            var costTotal = api
                .column(5, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            costTotal = formatMoney(costTotal);

            // Update footer by showing the total with the reference of the column index 
            $(api.column(0).footer()).html('Total');
            $(api.column(4).footer()).html(total);
            $(api.column(5).footer()).html('Re. '+costTotal);
        }
    });

    
    if ($("#from_date_history").length) {
        $('#from_date_history').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
            disableAfter: today_np.format("YYYY-MM-DD"),
            onChange: updateDataTableHistory
        });
        $("#from_date_history").val( month_start_np.format("DD/MM/YYYY"));
        $("#from_date_history + .clear-button").off("click");
        $("#from_date_history + .clear-button").on("click", function() {
            $("#from_date_history").val( month_start_np.format("DD/MM/YYYY"));
            updateDataTableHistory();
        });
    }

    if ($("#to_date_history").length) {
        $('#to_date_history').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
            disableAfter: today_np.format("YYYY-MM-DD"),
            onChange: updateDataTableHistory
        });
        $("#to_date_history").val( today_np.format("DD/MM/YYYY") );
        
        $("#to_date_history + .clear-button").off("click");
        $("#to_date_history + .clear-button").on("click", function() {
            $("#to_date_history").val( today_np.format("DD/MM/YYYY"));
            updateDataTableHistory();
        });
    }

    function updateDataTableHistory() {
        let start_js_val = $("#from_date_history").val();
        let end_js_val = $("#to_date_history").val();
        let start = new NepaliDate(start_js_val);
        let end = new NepaliDate(end_js_val);
        historyTable.ajax.url(`/inventory/api/${inventory_id}/history?start=${start.toJsDate().toISOString()}&end=${end.toJsDate().toISOString()}`).load();
    }


    
    $('#history-table thead tr').clone(true).appendTo( '#history-table thead' );
    $('#history-table thead tr:eq(1) th').each( function (i) {
        var title = $(this).text();
        $(this).html( '<input type="text" style="width: 100%; padding: 3px; box-sizing: border-box;" class="input is-small" placeholder="Search '+title+'" />' );
 
        $( 'input', this ).on( 'keyup change', function () {
            if ( historyTable.column(i).search() !== this.value ) {
                historyTable
                    .column(i)
                    .search( this.value )
                    .draw();
            }
        } );
    } );


    $("#add-batch-button").on('click', function () {
        $("#add-batch-modal").addClass('is-active');
    });

    $(".batch-edit-button").on('click', function () {
        var id = $(this).val();
        var name = $(this).attr('data-name');
        var quantity = $(this).attr('data-quantity');        
        $("#edit-batch-name").val(name);
        $("#edit-batch-quantity").val(quantity);
        $("#edit-batch-id").val(id);
        $("#edit-batch-modal").addClass('is-active');
    });

    $(".batch-delete-button").on('click', function() {
        var id = $(this).val();
        $("#confirm-delete").find("#delete-batch-id").val(id);
        $("#confirm-delete").addClass('is-active');
    });

    $("#inv-batch").on('change', function() {
        var quant = $("#inv-batch").find(':selected').attr('data-quant');
        quant = parseInt(quant);
        var quantity = $("#quantity").val();
        if (typeof quantity == 'string') {
            if (quantity.length == 0 || isNaN(quantity)) {
                quantity = 0;
            }else{
                quantity = parseInt(quantity);
            }
        }

        var total = quant * quantity;

        $("#total-quant").val(total);
    });

    $("#quantity").on('change', function() {
        var quant = $("#inv-batch").find(':selected').attr('data-quant');
        quant = parseInt(quant);
        var quantity = $("#quantity").val();
        if (typeof quantity == 'string') {
            if (quantity.length == 0 || isNaN(quantity)) {
                quantity = 0;
            }else{
                quantity = parseInt(quantity);
            }
        }

        var total = quant * quantity;

        $("#total-quant").val(total);
    });

    if($("input#record_date").length)
    $('input#record_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
    });

    if($("input#edit_record_date").length)
    $('input#edit_record_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
    });

    $("#type").on('change', function() {
        var val = $(this).val();
        if (val == 'transferred') {
            $("#inventory-warehouse-container").show();
        }else{
            $("#inventory-warehouse-container").hide();
        }
    });

    var inventory_cost = $("#inventory_cost").val();
    $("#type").on('change', function() {
        var val = $(this).val();
        if (val == 'discarded' || val == 'transferred') {
            $("#inventory_cost").val(0.0);
        }
        else{
            $("#inventory_cost").val(inventory_cost);
        }
    });

    // Reports Script
    // if($("#report-date-from").length)
    // $("#report-date-from").nepaliDatePicker({
    //     dateFormat: 'DD/MM/YYYY',
    // });

    // if($("#report-date-to").length)
    // $("#report-date-to").nepaliDatePicker({
    //     dateFormat: 'DD/MM/YYYY',
    // });

    fetchAndUpdateReport();
});