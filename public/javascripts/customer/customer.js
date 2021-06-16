function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

function showBill(element) {
    $(element).find('.bill_tracks').show();
}

function hideBill(element) {
    $(element).find('.bill_tracks').hide();
}


function editCustomerLedger(id, credit, date, user) {
    
    $("#edit-ledger-id").val(id);
    $("#edit-ledger-amount").val(credit);
    $("#edit-ledger-date").val(date);
    if (user) {
        $("#edit-ledger-user").val(user);
    }
    $("#ledger-edit-modal").addClass('is-active');
}

function deleteCustomerLedger(id) {

    $("#ledger-delete-form").attr('action', `/customer/ledger/${id}?_method=DELETE`);
    $("#confirm-delete").addClass('is-active');
}

$(function() {

    $.ajax({
        url: `/api/users/all`,
        success: function(users) {
            let options = '';
            for (let user of users) {
                if (user.id === 1) continue;
                options += `<option value="${user.id}">${user.first_name} ${user.last_name} (${user.user_type})</option>`;
            }
            $("#edit-ledger-user").html(options);
        },
        error: function(xhr, statusText, status) {
            console.log(xhr);
        }
    })

    // Check if fragment in the url is present
    if (window.location.hash) {
        var hsh = window.location.hash;
        switch(hsh) {
            case "#rates":
                resetTabs();
                $("#rates-tabs-link").addClass('is-active');
                $("#rates-tab").show();
                break;
            case "#records":
                resetTabs();
                $("#records-tabs-link").addClass('is-active');
                $("#records-tab").show();
                break;
            case "#bills":
                resetTabs();
                $("#bill-tabs-link").addClass('is-active');
                $("#bill-tab").show();
                break;
            case "#ledger":
                resetTabs();
                $("#ledger-tabs-link").addClass('is-active');
                $("#ledger-tab").show();
                break;
        }
    }

    $("#rates-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#rates-tab").show();
        window.location.hash = "rates";
    });

    $("#records-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#records-tab").show();
        window.location.hash = "records";
    });

    $("#bill-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#bill-tab").show();
        window.location.hash = "bills";
    });
    
    $("#ledger-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#ledger-tab").show();
        window.location.hash = "ledger";
    });

    var billingTable =  $("#billing-table").DataTable({
        "columnDefs": [
            { "width": "3%", "targets": 0 },
        ],
        "order": [[0, 'desc']],
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
                .column(2, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

         
            costTotal = formatMoney(costTotal);

            // Update footer by showing the total with the reference of the column index 
            $(api.column(0).footer()).html('Total');
            $(api.column(2).footer()).html('Re. '+costTotal);
        }
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
    
    if ($("#from_date_billing").length)
        $('#from_date_billing').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
        });

    if ($("#to_date_billing").length)
        $('#to_date_billing').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
        });

    if ($("#record_date").length)
        $('#record_date').nepaliDatePicker({
            dateFormat: 'DD/MM/YYYY',
        });

    setTimeout(function() {
        if ($("#edit-ledger-date").length)
            $("#edit-ledger-date").nepaliDatePicker({
                dateFormat: 'DD/MM/YYYY',
            });
    }, 1000);
    
    var ledger_table =  $("#ledger-table").DataTable({        
        "order": [[0, 'desc']],
    });

    $("#deposit-button").on('click', function() {
        $("#deposit-modal").addClass('is-active');
    });

    
    $('#ledger-table thead tr').clone(true).appendTo( '#ledger-table thead' );
    $('#ledger-table thead tr:eq(1) th').each( function (i) {
        var title = $(this).text();
        $(this).html( '<input type="text" style="width: 100%; padding: 3px; box-sizing: border-box;" class="input is-small" placeholder="Search '+title+'" />' );
 
        $( 'input', this ).on( 'keyup change', function () {
            if ( ledger_table.column(i).search() !== this.value ) {
                ledger_table
                    .column(i)
                    .search( this.value )
                    .draw();
            }
        } );
    } );

    $("#from_date_billing, #to_date_billing").on('change', function() {
        billingTable.draw();
    });

    $.get("/api/customer/rented/"+customer_id, function(data) {
        $("#jars-rented-text").html(data.rented)
    }).fail(function(err) {
        console.log("Err", err);
        $("#jars-rented-text").html("N/A");
    });

    $.get("/api/stats/customer/sale/"+customer_id+"?date="+current_month, function(data) {
        $("#month-sale-text").html(data.total);
    }).fail(function(err) {
        console.log("Err", err);
        $("#month-sale-text").html("N/A");
    }); 

    $.get("/api/stats/customer/sale/"+customer_id+"?total=true", function(data) {
        $("#total-sale-text").html(data.total);
    }).fail(function(err) {
        console.log("Err", err);
        $("#total-sale-text").html("N/A");
    });

    $.get("/api/stats/customer/outstanding/"+customer_id, function(data) {
        if (data.outstanding == '0') {
            $("#outstanding-text").removeClass('has-text-danger');
        }
        $("#outstanding-text").html(data.outstanding);
    }).fail(function(err) {
        console.log(err);
        $("#outstanding-text").html("N/A");
    });

    $("#month-sale").on('change', function() {
        var dt = $(this).val();
        $("#month-sale-text").html('...');
        $.get("/api/stats/customer/sale/"+customer_id+"?date="+dt, function(data) {
            $("#month-sale-text").html(data.total);
        }).fail(function(err) {
            console.log("Err", err);
            $("#month-sale-text").html("N/A");
        }); 
    });


    $.get("/api/stats/customer/balance/"+customer_id, function(data) {
        if (data.balance < 0) {
            $("#balance-text").addClass('has-text-danger');    
        } else if (data.balance > 0) {
            $("#balance-text").addClass('has-text-success');    
        }
        $("#balance-text").html(data.formatted);
    }).fail(err => {
        console.log(err);
        $("#balance-text").html('N/A');
    });

});