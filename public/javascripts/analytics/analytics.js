const today_np = new NepaliDate(new Date());
const month_start_np = new NepaliDate(
    today_np.getYear(),
    today_np.getMonth(),
    1
);


$(() => {
    var cashInflowChartData = null;
    
    $.ajax({
        type: "GET",
        url: `/api/analytics/inflow/chart`,
        data: {warehouse: 0},
        success: function (res) {
            if (res.status === 'success') {
                cashInflowChartData = res;
            } else {
                warn("Charts cannot be show at the moment");
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
            warn("Charts cannot be shown at the moment");
        },
    });

    
    function initCashInflow(start_js, end_js, warehouse) {
        // Get this month cash inflow
        $.ajax({
            type: "GET",
            url: "/api/analytics/inflow",
            data: { start: start_js.toISOString(), end: end_js.toISOString(), warehouse},
            success: function (res) {
                anime({
                    targets: "#cash-inflow-value",
                    textContent: res.data.formatted,
                    round: 1 / 5,
                    easing: "easeInOutQuad",
                    duration: 1000,
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseJSON);
                console.log("Something we wrong");
                warn("Something went wrong, Try again later");
            },
        });
    }

    var cashInflowChart = null;

    function initCashInflowChart(res) {
        const labels = [];
        const data_points = [];
        for(let i = res.data.length - 1; i >= 0; i--) {
            let data_point = res.data[i];
            labels.push(data_point.name);
            data_points.push(data_point.value.total);
        }
        const data = {
            labels: labels,
            datasets: [{
                label: 'Cash Inflow',
                data: data_points,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };

        // Chart js
        var ctx = document.getElementById("cash-inflow-chart");
        cashInflowChart = new Chart(ctx, {
            type: 'line',
            data: data,
        });
        
    }

    function updateCashInflow() {
        let end = $("#to_date_cash_inflow").val();
        let start = $("#from_date_cash_inflow").val();
        let warehouse = $("#inflow-warehouse-select").val();
        let start_np = new NepaliDate(start);
        let start_js = start_np.toJsDate();
        let end_np = new NepaliDate(end);
        let end_js = end_np.toJsDate();

        $("#cash-inflow-date").html(
            start_np.format("DD MMMM, YYYY", "np") +
            " &rarr; " +
            end_np.format("DD MMMM, YYYY", "np")
        );

        initCashInflow(start_js, end_js, warehouse);
    }

    
    const card_1_click = function () {
        
        anime({
            targets: "#analytics-card-4",
            "flex-grow": 0,
            duration: 300,
            easing: "easeInOutQuad",
        });
        anime({
            targets: "#analytics-card-4 .box",
            opacity: 0,
            duration: 200,
        });

        anime({
            targets: "#analytics-card-1 #cash-flow-small",
            opacity: 0,
            easing: "linear",
            duration: 200,
        });

        anime({
            targets: "#analytics-card-1",
            "flex-grow": 2,
            height: "450px",
            duration: 300,
            easing: "easeInOutQuad",
        }).finished.then(() => {

            $("#analytics-card-1 .card-close-button")
                .show()
                .css("display", "inline-flex");
            $("#analytics-card-1").off("click");

            // set up large view

            $("#cash-inflow-date").hide();

            $("#analytics-card-1 #cash-flow-small").css({
                "align-items": "flex-start",
                "justify-content": "flex-start",
                "flex-direction": "row",
            });

            anime({
                targets: "#analytics-card-1 #cash-flow-small",
                opacity: 1,
                easing: "linear",
                duration: 200,
            });

            $(".cash-inflow-title").css({
                "margin-top": 8,
                "margin-right": 24,
            });

            $("#card-date-select-region").show();

            if (cashInflowChartData) {
                initCashInflowChart(cashInflowChartData);
            }
        });
    }

    const card_1_close = function () {

        anime({
            targets: "#analytics-card-1 #cash-flow-small",
            opacity: 0,
            easing: "linear",
            duration: 200,
        });

        $("#card-date-select-region").hide();

        anime({
            targets: "#analytics-card-1",
            "flex-grow": 1,
            height: "185px",
            duration: 300,
            easing: "easeInOutQuad",
        }).finished.then(() => {

            if (cashInflowChart !== null) {
                cashInflowChart.destroy();
                cashInflowChart = null;
            }

            $("#analytics-card-1 .card-close-button").hide();
            $("#analytics-card-1").on("click", card_1_click);
            $("#analytics-card-1 #cash-flow-small").css({
                "flex-direction": "column",
                "align-items": "center",
                "justify-content": "flex-start",
            });

            $("#cash-inflow-date").show();

            $(".cash-inflow-title").css({
                "margin-top": 8,
            });
            setTimeout(() => {
                $("#analytics-card-4 .box").css("opacity", 1);
            }, 200);

            anime({
                targets: "#analytics-card-1 #cash-flow-small",
                opacity: 1,
                easing: "linear",
                duration: 200,
            });
        });
        anime({
            targets: "#analytics-card-4",
            "flex-grow": 1,
            duration: 300,
            easing: "easeInOutQuad",
        }).finished.then(() => { });
    }

    $("#inflow-warehouse-select").on('change', function() {
        updateCashInflow();
        $.ajax({
            type: "GET",
            url: `/api/analytics/inflow/chart`,
            data: {warehouse: $(this).val()},
            success: function (res) {
                if (res.status === 'success') {
                    cashInflowChartData = res;
                    if (cashInflowChart !== null) {
                        cashInflowChart.destroy();
                        cashInflowChart = null;
                    }
                    initCashInflowChart(res);
                } else {
                    warn("Charts cannot be show at the moment");
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                warn("Charts cannot be shown at the moment");
            },
        });
    });

    const formatted_date =
        month_start_np.format("MMMM", "np") + ", " + today_np.getYear();
    $("#cash-inflow-date").html(formatted_date);
    let start_js = month_start_np.toJsDate();
    let end_js = today_np.toJsDate();
    initCashInflow(start_js, end_js, 0);

    $("#test-neapli-date-picker").val(today_np.format("DD/MM/YYYY"));

    if ($("#from_date_cash_inflow").length)
    $("#from_date_cash_inflow").nepaliDatePicker({
        dateFormat: "DD/MM/YYYY",
        disableAfter: today_np.format("YYYY-MM-DD"),
        onChange: updateCashInflow,
    });

    $("#from_date_cash_inflow").val(month_start_np.format("DD/MM/YYYY"));

    $("#from_date_cash_inflow + .clear-button").off("click");
    $("#from_date_cash_inflow + .clear-button").on("click", function () {
        $("#from_date_cash_inflow").val(month_start_np.format("DD/MM/YYYY"));
        updateCashInflow();
    });

    if ($("#to_date_cash_inflow").length)
    $("#to_date_cash_inflow").nepaliDatePicker({
        dateFormat: "DD/MM/YYYY",
        disableAfter: today_np.format("YYYY-MM-DD"),
        onChange: updateCashInflow,
    });

    $("#to_date_cash_inflow").val(today_np.format("DD/MM/YYYY"));
    $("#to_date_cash_inflow + .clear-button").off("click");
    $("#to_date_cash_inflow + .clear-button").on("click", function () {
        $("#to_date_cash_inflow").val(today_np.format("DD/MM/YYYY"));
        updateCashInflow();
    });


    $("#analytics-card-1").on("click", card_1_click);

    // Closing card
    $("#card-close-button-1").on("click", card_1_close);

    // Get all warehouse
    $.ajax({
        type: 'GET',
        url: `/api/warehouse/all`,
        success: function(data) {
            let options = `<option value="0">All</option>`;
            for (let warehouse of data.warehouses) {
                options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
            }
            $("#inflow-warehouse-select").html(options);
        }, 
        error: function(xhr, statusText, status) {
            console.log(xhr);
        }
    });

    const card_2_click = function() {

    }

});
