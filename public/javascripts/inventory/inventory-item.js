function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}


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
    record_id
) {
    $("#edit-inventory-type").val(type);
    var nepali_date = convertEnglishToNepali(date);
    $("#edit_record_date").val(nepali_date);
    $("#edit_inventory_cost").val(cost);
    $("#edit-inv-batch").val(packing);
    $("#edit-quantity").val(quantity);
    $("#edit-inventory-record-modal").find('form').attr('action', '/inventory/edit/'+record_id+'?_method=PUT');
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



    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
            if (settings.nTable.id !== 'billing-table') return true;

            var min_date = $("#from_date_billing").val();
            if (!validDate(min_date)) {
                min_date = "0/0/0";
            }
            var max_date = $("#to_date_billing").val();
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

    
    $('#from_date_billing').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
        onChange: () => {billingTable.draw();}
    });

    $('#to_date_billing').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
        onChange: () => {billingTable.draw();}
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

    var historyTable = $("#history-table").DataTable({
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


    $('input#record_date').nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
    });

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
    $("#report-date-from").nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
    });

    $("#report-date-to").nepaliDatePicker({
        dateFormat: 'DD/MM/YYYY',
    });

    fetchAndUpdateReport();
});