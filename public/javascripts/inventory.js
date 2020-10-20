$(document).ready(() => {
    $("#add-inventory-button").click(e => {
        $("#add-inventory-modal").toggleClass('is-active');
    });

    FilePond.registerPlugin(FilePondPluginImagePreview);

    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create( inputElement, {
        labelIdle: 'Add Image',
        server: {
            url: '/inventory/image/',
            process: 'process',
            revert: 'revert',
        },
        onerror: e => {
            console.log(e);
        },
        
    } );

    $("#add-inventory-modal form").submit(e => {
        e.preventDefault();
        var form = $(e.target);
        var name = form.find('input[name="name"]');
        var cost = form.find('input[name="cost"]');
        var type = form.find('select[name="type"]');
        var passed = true;
        if (name.val().trim().length === 0) {
            name.addClass('is-danger');
            name.siblings('.help').show();
            passed = false;
        }else{
            name.addClass('is-success');
        }

        if (cost.val().trim().length === 0 || isNaN(cost.val())) {
            cost.addClass('is-danger');
            cost.siblings('.help').show();
            passed = false;
        }else{
            cost.addClass('is-success');
        }

        if (type.val() === 'purchased' || type.val() === 'manufactured' ) {
            type.addClass('is-success');
        }else{
            type.addClass('is-danger');
            type.siblings('.help').show();
            passed = false;
        }
        form.off();
        if (passed) {
            form.submit();
        }
    });

    $("#add-inventory-modal form input, #add-inventory-modal form select").on('change', e => {
        var element = $(e.target);
        element.removeClass('is-danger');
        element.siblings('.help').hide();
    });

    $("#add-inventory-modal form select").on('change', e => {
        var val = e.target.value;
        if (val === 'purchased') {
            $(".cost-label").html('Cost');
        }
        else if (val === 'manufactured') {
            $('.cost-label').html('Cost Of Manufacture');
        }
    });

    $(".inventory-card").click( e => {
        var id = $(e.target).parents('.inventory-card').attr('data-value');
        window.location.href = '/inventory/'+id;
    });

});