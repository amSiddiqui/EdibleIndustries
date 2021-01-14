function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

$(function() {
    $("#rates-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#rates-tab").show();
    });

    $("#records-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#records-tab").show();
    });

    $("#bill-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#bill-tab").show();
    });

    var total = 0;
    var table_loaded = new Promise((resolve, reject) => {
        $('.rent-status').each(function() {
            let id = $(this).attr('data-key');
            var container = $(this);
            $.get('/api/check-item-rented/'+id, function(data) {
                if (data.status == 'success') {
                    if (data.result) {
                        container.append('<span class="has-text-danger">Rented</span>');
                    }else{
                        container.append('<span class="has-text-success">No</span>');
                    }
                }
            }).fail(function(err) {
                console.log(err);
            }).always(function() {
                total++;
                if (total == totals_bills) {
                    resolve();
                }
            });
        });
    });
    table_loaded.then(function() {
        $("#billing-table").DataTable({
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
    });

});