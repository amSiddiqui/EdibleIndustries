$(function () {
    $("#customer-table").DataTable({
        "columnDefs": [
            { "width": "3%", "targets": 0 },
        ],
        "order": [[0, 'desc']]
    });
    
});