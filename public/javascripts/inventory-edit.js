$(document).ready(() => {
    $("#delete-inventory-button").click(e => {
        $("#confirm-delete").addClass('is-active');
    });

    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create( inputElement, {
        labelIdle: 'Add Image',
        server: {
            url: '/api/image/',
            process: 'process',
            revert: 'revert',
        },
        files: [
            {
                // the server file reference
                source: image_location,
                options: {
                    type: 'local'
                }
            }
        ],
        onerror: e => {
            console.log(e);
        },
        onprocessfile: (e, f) => {
            var reader = new FileReader();
            reader.readAsDataURL(f.file);
            reader.onload = function() {
                console.log(reader.result);
                $("#inventory-edit-container img").attr('src', reader.result);
            };
        },
        onremovefile: (e, f) => {
            $("#inventory-edit-container img").attr('src', '/images/warehouse.svg');
        }
    } );


    $("#inventory-edit-container form").submit(e => {
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

    $("#inventory-edit-container form input, #inventory-edit-container form select").on('change', e => {
        var element = $(e.target);
        element.removeClass('is-danger');
        element.siblings('.help').hide();
    });

    $("#inventory-edit-container form select").on('change', e => {
        var val = e.target.value;
        if (val === 'purchased') {
            $(".cost-label").html('Cost');
        }
        else if (val === 'manufactured') {
            $('.cost-label').html('Cost Of Manufacture');
        }

    });

});