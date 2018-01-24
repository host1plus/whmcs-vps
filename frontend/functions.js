function H1P_vps() {}

H1P_vps.show_error = function( response ){
    $('[data-error-alert] [data-error-messsage]').text( 'Message: ' + response.message );
    $('[data-error-alert]').show();
}

H1P_vps.service_init = function(){
    $.when(
        H1PapiCall( service_id + '/jobs', 'GET', '', {page:1, pagesize:5, statusCode: '0,1', disabled: 0} )
    ).then(function(response){
        if( response.data.length > 0 ){
            H1P_vps.service_check_job( response.data[0].id );
        }
    },
    function(response){
    }
    );

    H1P_vps.load_product_options();

    $('[data-select-minutes]').html('');
    for(var i = 0; i < 60; i++) {
        $('[data-select-minutes]').append('<option value="'+(i>9?i:"0"+i)+'">'+(i>9?i:"0"+i)+'</option>');
    }
    $('[data-select-hours]').html('');
    for(var i = 0; i < 24; i++) {
        $('[data-select-hours]').append('<option value="'+(i>9?i:"0"+i)+'">'+(i>9?i:"0"+i)+'</option>');
    }
    $('[data-select-dayofmonth]').html('');
    for(var i = 1; i <= 28; i++) {
        $('[data-select-dayofmonth]').append('<option value="'+(i>9?i:"0"+i)+'">'+(i>9?i:"0"+i)+'</option>');
    }

}

H1P_vps.service_load_info = function(){

    H1P_vps.lock_service_front();

    $.when(
        H1PapiCall( service_id, 'GET', {}, {} )
    ).then(function(response){
        service_data = response.data;
        console.log( service_data );

        H1P_vps.service_init();

        volumes = response.data.hdd;
        H1P_vps.show_service_info();
        H1P_vps.service_load_backups();
        H1P_vps.service_load_tasks();
        
        H1P_vps.loadStatistics();
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.show_service_info = function(){

    H1P_vps.loadSchedules();

    $('[data-service-state]').text( H1P_vps.capitalizeFirstLetter( service_data.state ) )
    $('[data-service-state]').removeClass('text-success').removeClass('text-warning')
    if( service_data.state.toLowerCase() == 'running' ) $('[data-service-state]').removeClass('text-danger').addClass('text-success');
    if( service_data.state.toLowerCase() == 'stopped' ) $('[data-service-state]').removeClass('text-success').addClass('text-danger');

    $('[data-service-cpu]').text( service_data.cpu )
    $('[data-service-template]').text( service_data.osTemplate )

    $('[data-service-location]').text( '-' )
    $('[data-service-ram]').text( service_data.ram + ' MB' )
    $('[data-service-server]').html( service_data.ip[0].address + ' <br> root / <span data-service-password>*****</span> <small style="cursor:pointer;" data-show-pass>['+js_lang.show+']</small><small data-hide-pass style="cursor:pointer;display:none;">['+js_lang.hide+']</small>' )

    $('[data-hostname-input]').val( service_data.hostname );

    $('[data-storage-list]').html('');

    for (const key in volumes) {
        if (volumes.hasOwnProperty(key)) {
            const storage = volumes[key];
        
            var html = '';

            html += '<tr>';
            
            html += '<td>'+storage.name+'</td>';
            html += '<td>'+H1P_vps.bytesToString( storage.size * 1024 * 1024, 0 )+'</td>';
            html += '<td><button class="btn btn-default btn-sm" onclick="H1P_vps.create_backup()" data-btn-lockable>'+js_lang.backup+'</button> <button class="btn btn-default btn-sm" data-btn-lockable onclick="$(\'[data-schedule-disk-id]\').val(\''+ storage.id +'\')" data-toggle="modal" data-target="#backup_schedule_modal">'+js_lang.backup_schedule+'</button></td>';

            html += '</tr>';

            $('[data-storage-list]').append( html );

            $('[data-restore-backup-disk]').append('<option value="'+ storage.id +'">'+ storage.name +'</option>');
        }
    }

    // vnc
    vnc = service_data.vnc;

    if( vnc.state == 'running' && vnc.mode != 'off' ){
        $('[data-start-vnc-btn]').prop('disabled', 1);
        $('[data-stop-vnc-btn]').prop('disabled', 0);
    }
    else if( vnc.state == 'stopped' || vnc.mode == 'off' ){
        $('[data-start-vnc-btn]').prop('disabled', 0);
        $('[data-stop-vnc-btn]').prop('disabled', 1);
    }

   H1P_vps.unlock_service_front();

    $('[data-additionalIP-list]').html('');

    for (const key in service_data.ip) {
        if( key == 0 ) continue;
        if (service_data.ip.hasOwnProperty(key)) {
            const ip = service_data.ip[key].address;
        
            var html = '';

            html += '<tr>';
            
            html += '<td>'+ip+'</td>';
            
            html += '</tr>';

            $('[data-additionalIP-list]').append( html );
        }
    }
}

H1P_vps.create_backup = function(){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {

        var d = new Date();

        var send_data = {
            type: 'full'
        };
        send_data.name =  service_id + '_'+d.yyyymmdd() ;

        $.when(
            H1PapiCall( service_id + '/backups', 'POST', JSON.stringify(send_data), {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_vps.service_check_job( response.data.id );
            }
            else{
                H1P_vps.show_error( response );
            }
        },
        function(response){
            H1P_vps.show_error( response.responseJSON );
        }
        );
    } else {
       H1P_vps.unlock_service_front();
    }
}

H1P_vps.service_load_backups = function(){
    $.when(
        H1PapiCall( service_id + '/backups', 'GET', {}, {} )
    ).then(function(response){
        backups = response.data;
        H1P_vps.service_list_backups();
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.service_list_backups = function(){
    $('[data-backups-list]').html('');

    if( backups.length > 0 ){
        for (const key in backups) {
            if (backups.hasOwnProperty(key)) {
                const bck = backups[key];
            
                var html = '';

                html += '<tr>';
                
                html += '<td class="w200">'+bck.name+'</td>';
                html += '<td>'+H1P_vps.bytesToString( bck.size, 0 )+'</td>';
                html += '<td>'+bck.date.substr(0, bck.date.indexOf('.'));+'</td>';
                html += '<td><button class="btn btn-default btn-sm" data-btn-lockable onclick="H1P_vps.restore_backup(\''+ bck.uuid +'\')">'+js_lang.restore+'</button> <button class="btn btn-danger btn-sm" data-btn-lockable onclick="H1P_vps.delete_backup(\''+bck.uuid+'\')">'+js_lang.delete+'</button></td>';

                html += '</tr>';

                $('[data-backups-list]').append( html );
            }
        }
    }
    else{
        $('[data-backups-list]').html('<tr><td colspan=4>'+js_lang.nodata+'</td></tr>');
    }
}


H1P_vps.restore_backup = function( backup_id ){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();
    
    
    var r = confirm( js_lang.are_you_sure );
    if (r == true) {

        $.when(
            H1PapiCall( service_id +'/backups/'+ backup_id +'/restore', 'POST', {}, {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_vps.service_check_job( response.data.id );
            }
            else{
                H1P_vps.show_error( response );
               H1P_vps.unlock_service_front();
            }
        },
        function(response){
            H1P_vps.show_error( response.responseJSON );
           H1P_vps.unlock_service_front();
        }
        );
    }
}

H1P_vps.delete_backup = function( id ){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id +'/backups/' + id, 'DELETE', {}, {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_vps.service_check_job( response.data.id );
            }
            else{
                H1P_vps.show_error( response );
            }
        },
        function(response){
            H1P_vps.show_error( response.responseJSON );
        }
        );
    } else {
       H1P_vps.unlock_service_front();
    }
}

H1P_vps.delete_schedule = function( id, disk_id ){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id + '/schedules/' + id, 'DELETE', {}, {} )
        ).then(function(response){
            H1P_vps.loadSchedules();
           H1P_vps.unlock_service_front();
        },
        function(response){
            H1P_vps.show_error( response.responseJSON );
           H1P_vps.unlock_service_front();
        }
        );
    } else {
       H1P_vps.unlock_service_front();
    }
}


H1P_vps.service_restart = function(){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    $.when(
        H1PapiCall( service_id +'/restart', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.service_stop = function(){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    $.when(
        H1PapiCall( service_id +'/stop', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.service_start = function(){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    $.when(
        H1PapiCall( service_id +'/start', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.service_load_tasks = function(){
    $.when(
        H1PapiCall( service_id + '/jobs', 'GET', '', {page:1, pagesize:20, sort:'id', sortDesc:1, disabled:0} )
    ).then(function(response){
        if( response.data.length > 0 ){
            $('[data-tasklog-list]').html('');
            for (const key in response.data) {
                if (response.data.hasOwnProperty(key)) {
                    const task = response.data[key];
                
                    var html = '';
        
                    html += '<tr>';
                    
                    html += '<td class="">'+task.status+'</td>';
                    html += '<td>'+task.instance+'</td>';
                    html += '<td>'+task.action+'</td>';
                    html += '<td>'+H1P_vps.unixToDate( task.created )+'</td>';
        
                    html += '</tr>';
        
                    $('[data-tasklog-list]').append( html );
                }
            }
        }
        else{
            $('[data-tasklog-list]').html('<tr><td colspan=4>'+js_lang.nodata+'</td></tr>');
        }
    },
    function(response){
    }
    );
}

H1P_vps.openConsole = function(){

    $('[data-vnc-loader-wrap]').hide();
    if( vnc.state == 'running' && vnc.mode != 'off' ){
       vps_console_connect();
    }
}


H1P_vps.service_startConsole = function(){

    $('[data-vnc-loader-wrap]').show();

    $.when(
        H1PapiCall( service_id + '/vnc/start', 'POST', {}, {} )
    ).then(function(response){
        H1P_vps.service_load_tasks();
        if( response.status == 'success' ){
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}
H1P_vps.service_stopConsole = function(){

    $('#vnc_modal').find('[data-dismiss="modal"]').click();

    $.when(
        H1PapiCall( service_id + '/vnc/stop', 'POST', {}, {} )
    ).then(function(response){
        H1P_vps.service_load_tasks();
        if( response.status == 'success' ){
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.create_backup_schedule = function(){

    $('[data-error-msg-wrapper]').hide();

    $('[data-add-backup-schedule]').prop('disabled',true);
    $('[data-add-backup-schedule]').append(' <i class="fa fa-spinner fa-pulse fa-fw" data-loader-temp></i>');

    var exec_date  = new Date(); // for now

    var current_year    = exec_date.getUTCFullYear();
    var current_month   = exec_date.getUTCMonth();
    var current_weekday = exec_date.getUTCDay();
    var current_day     = exec_date.getUTCDate();

    var current_hour   = exec_date.getUTCHours();
    var current_minute = exec_date.getUTCMinutes();

    var intervaltype = $('[data-schedule-interval]').val();

    switch( intervaltype ) {
        case 'hourly':
            var minute = parseInt( $('[data-schedule-time-HOURLY] [data-select-minutes]').val() );
            if( minute <= current_minute ){ // add hour if minute passed
                exec_date.setTime(exec_date.getTime() + (60*60*1000));
            }

            exec_date.setUTCMinutes( minute );
        break;

        case 'daily':
            var hour = parseInt( $('[data-schedule-time-DAILY] [data-select-hours]').val() );
            var minute = parseInt( $('[data-schedule-time-DAILY] [data-select-minutes]').val() );
            if(
                hour < current_hour
                ||
                ( hour == current_hour && minute < current_weekday )
            ){ // add day if hour passed
                exec_date.setTime(exec_date.getTime() + (24*60*60*1000));
            }

            exec_date.setUTCHours( hour );
            exec_date.setUTCMinutes( minute );
        break;

        case 'weekly':
            var hour = parseInt( $('[data-schedule-time-WEEKLY] [data-select-hours]').val() );
            var minute = parseInt( $('[data-schedule-time-WEEKLY] [data-select-minutes]').val() );
            var weekday = parseInt( $('[data-schedule-time-WEEKLY] [data-select-weekday]').val() );
            if(
                weekday < current_weekday
                ||
                ( weekday == current_weekday && hour < current_hour )
                ||
                ( weekday == current_weekday && hour == current_hour && minute < current_weekday )
             ){ // if weekday is passed for this week
                var distance = (weekday + 7 - current_weekday);
                exec_date.setDate(exec_date.getDate() + distance)
            }
            else{
                var distance = weekday - current_weekday;
                exec_date.setDate(exec_date.getDate() + distance);
            }

            exec_date.setUTCHours( hour );
            exec_date.setUTCMinutes( minute );
        break;
        case 'monthly':
            var hour = parseInt( $('[data-schedule-time-MONTHLY] [data-select-hours]').val() );
            var minute = parseInt( $('[data-schedule-time-MONTHLY] [data-select-minutes]').val() );
            var dayofmonth = parseInt( $('[data-schedule-time-MONTHLY] [data-select-dayofmonth]').val() );
            if(
                dayofmonth < current_day
                ||
                ( dayofmonth == current_day && hour < current_hour )
                ||
                ( dayofmonth == current_day && hour == current_hour && minute < current_weekday )
             ){
                exec_date.setUTCDate( dayofmonth );
                // add month if day passed
                exec_date.setTime(exec_date.getTime() + (30*24*60*60*1000));
            }
            else{
                exec_date.setUTCDate( dayofmonth );
            }

            exec_date.setUTCHours( hour );
            exec_date.setUTCMinutes( minute );
        break;

    }

    var first_exec_time = parseInt( exec_date.getTime() / 1000 ); // seconds

    var schedule_name = 'vps_schedule_'+service_id;

    var send_data = {
        name: schedule_name,
        interval: intervaltype,
        executeAfter: first_exec_time,
        copyAmount: 1,
    };

    $('#backup_schedule_modal').find('[data-dismiss="modal"]').click();

    $.when(
        H1PapiCall( service_id + '/schedules', 'POST', JSON.stringify(send_data), {})
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_vps.loadSchedules();
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.loadSchedules = function(){

    for(const key in volumes) {
        let disk_id = volumes[key].id;

        let disk_info = H1P_vps.getDiskById( disk_id );

        $.when(
            H1PapiCall( service_id + '/schedules', 'GET', {}, {} )
        ).then(function(response){

            $('[data-schedules-list]').find('[data-no-data]').remove();
            $('[data-schedules-list]').find('[data-schedule-loader]').remove();
            $('[data-schedules-list]').find('[data-disk-id="'+disk_id+'"]').remove();

            if( response.data.length > 0 ){
                
                for (const key in response.data) {
                    if (response.data.hasOwnProperty(key)) {
                        const schedule = response.data[key];
                    
                        var schedule_type = '';
                        var time = '';
                        var day_text = '';
                        var day_value_text = '';

                        switch(schedule.interval) {
                            case 'daily':
                                schedule_type = 'HOURLY';
                                time = schedule.executeAfter;
                            break;
                            case 1:
                                schedule_type = 'DAILY';
                                time = schedule.executeAfter;
                            break;  
                            case 'weekly':
                                schedule_type = 'WEEKLY';
                                time = schedule.executeAfter;
                            break;
                            case 'monthly':
                                schedule_type = 'MONTHLY';
                                time = schedule.executeAfter;
                            break;
            
                        }

                        var html = '';
            
                        html += '<tr data-disk-id="'+disk_id+'">';
                        
                        html += '<td>'+disk_info.name+'</td>';
                        html += '<td class="">'+schedule_type+'</td>';
                        html += '<td>'+H1P_vps.unixToDateUTC( time )+ '</td>';
                        html += '<td><button class="btn btn-danger btn-sm" data-btn-lockable onclick="H1P_vps.delete_schedule(\''+schedule.uuid+'\', \''+disk_info.id+'\')">'+js_lang.delete+'</button></td>';
            
                        html += '</tr>';
            
                        $('[data-schedules-list]').append( html );
                    }
                }
            }
            else{
                if( $('[data-schedules-list]').children().length < 1 ){
                    $('[data-schedules-list]').html('<tr data-no-data><td colspan=4>'+js_lang.nodata+'</td></tr>');
                }
            }
        },
        function(response){
        }
        );
    }
}

H1P_vps.getDiskById = function( id ){
    
    if( volumes.length > 0 ){
        for (const key in volumes) {
            if (volumes.hasOwnProperty(key)) {
                if( volumes[key].id == id ){
                    return volumes[key];
                }
            }
        }
    }
    
    return {};
}

H1P_vps.service_check_job = function( id ){
    if( typeof id != 'undefined' ){
        last_job_id = id;
    }
    H1P_vps.lock_service_front();
    $.when(
        H1PapiCall( service_id + '/jobs/'+last_job_id, 'GET', '', {} )
    ).then(function(response){
        if( response.data.statusCode == 2 ){// statusCode = 2 , means completed
            last_job_id = null;
            frontend_state = 'active';
            H1P_vps.service_load_info();
            
            if( response.data.action == 'removeVnc' ){
                $('[data-vnc-loader-wrap]').hide();
                hide_vnc_block();
            }
            else if( response.data.action == 'createVnc' ){
                vnc_load();
            }
        }
        else if( response.data.statusCode == 3 ){// statusCode = 3 , means failed
            last_job_id = null;
            H1P_vps.service_load_info();
        }
        else{
            var start_time = response.data.created;
            var curent_time =  Math.floor(Date.now() / 1000);
            var seconds_passed = (curent_time - start_time);
            var timeout = 300000;
            if( seconds_passed < 60 ){
                timeout = 5000;
            }
            else if( seconds_passed >= 60 && seconds_passed < 120 ){
                timeout = 10000;
            }
            else if( seconds_passed >= 120 && seconds_passed < 300 ){ //5 mins passed
                timeout = 20000;
            }
            else if( seconds_passed >= 300 && seconds_passed < 600 ){ //10 mins passed
                timeout = 60000;
            }
            else if( seconds_passed >= 600 && seconds_passed < 1800 ){ //30 mins passed
                timeout = 300000;
            }
            //console.log( timeout );
            setTimeout(H1P_vps.service_check_job, timeout);
        }
    },
    function(response){
        setTimeout(H1P_vps.service_check_job, 30000);
    }
    );
}

H1P_vps.service_reset_pw = function(){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id + '/resetPassword', 'POST', '', {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_vps.service_check_job( response.data.id );
            }
            else{
                H1P_vps.show_error( response );
            }
        },
        function(response){
            H1P_vps.show_error( response.responseJSON );
        }
        );
    }
    else{
       H1P_vps.unlock_service_front();
    }
}

H1P_vps.service_load_templates = function(){
    $('[data-reinstall-content]').hide();
    $('[data-reinstall-loader]').show();
    $.when(
        H1PapiCall( service_id + '/templates', 'GET', '', {} )
    ).then(function(response){
        if( response.status == 'success' ){

            $('[data-reinstall-template-select]').html('');
            
            if( response.data.length > 0 ){
                for (const key in response.data) {
                    if (response.data.hasOwnProperty(key)) {
                        const template = response.data[key];

                        $('[data-reinstall-template-select]').append('<option value="'+template.id+'">'+template.name+'</option>');
                    }
                }
            }

            $('[data-reinstall-loader]').hide();
            $('[data-reinstall-content]').show();
        }
        else{
            H1P_vps.show_error( response );
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.service_reinstall_template = function(){

    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();
    $('#reinstall_modal').find('[data-dismiss="modal"]').click();

    var template_id = $('[data-reinstall-template-select]').val();

    $.when(
        H1PapiCall( service_id +'/reinstall', 'POST', JSON.stringify({osTemplate:template_id}), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
           H1P_vps.unlock_service_front();
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
       H1P_vps.unlock_service_front();
    }
    );

}

H1P_vps.service_change_hostname = function(){
    H1P_vps.lock_service_front();
    $('[data-error-alert]').hide();
    $('#changehostname_modal').find('[data-dismiss="modal"]').click();

    var new_label = $('input[data-hostname-input]').val();

    var patch_data = { "hostname": new_label };

    $.when(
        H1PapiCall( service_id+'/hostname', 'PATCH', JSON.stringify( patch_data ), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            $('[data-hostname-input]').text( new_label );
            H1P_vps.service_check_job( response.data.id );
        }
        else{
            H1P_vps.show_error( response );
           H1P_vps.unlock_service_front();
        }
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
       H1P_vps.unlock_service_front();
    }
    );
}

H1P_vps.lock_service_front = function(){
    $('[data-btn-lockable]').addClass('disabled').prop('disabled', true).css('pointer-events', 'none');
    $('[data-loader]').show();
}
H1P_vps.unlock_service_front = function(){
    $('[data-btn-lockable]').removeClass('disabled').prop('disabled', false).css('pointer-events', 'auto');
    $('[data-loader]').hide();
}

H1P_vps.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

H1P_vps.bytesToString = function(bytes, decimals) {
   if(bytes == 0) return '0 B';
   var k = 1024;
   var dm = decimals + 1 || 3;
   var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

H1P_vps.unixToDate = function( unix_timestamp ){
    var date = new Date(unix_timestamp*1000);

    var months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

    var year = date.getFullYear();
    var month = months[date.getMonth()];
    var day = date.getDate();

    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    
    // Will display time in 10:30:23 format
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}

H1P_vps.unixToDateUTC = function( unix_timestamp ){
    var date = new Date(unix_timestamp*1000);

    var months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

    var year = date.getUTCFullYear();
    var month = months[date.getUTCMonth()];
    var day = date.getUTCDate();

    var hours = date.getUTCHours();
    var minutes = "0" + date.getUTCMinutes();
    var seconds = "0" + date.getUTCSeconds();
    
    // Will display time in 10:30:23 format
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}


//events
$(document).on('click', '[data-show-pass]', function(){
    $(this).hide()
    $('[data-hide-pass]').show()
    $('[data-service-password]').text( service_data.password )
});
$(document).on('click', '[data-hide-pass]', function(){
    $(this).hide()
    $('[data-show-pass]').show()
    $('[data-service-password]').text('***')
});
$(document).on('click', '[data-schedule-interval]', function(){
    $('[data-schedule-time]').hide()
    $('[data-schedule-time-'+$(this).val()+']').show()
});

H1P_vps.offsetDate = function( offset ){
    var date = new Date();
    date.setDate(date.getDate() + offset);
    return date;
}

H1P_vps.stat_limit_change = function(){
    var limit = $('[data-stats-limit]').val();

    switch (limit) {
        case 'h':
            stats_retention = '1w';
        break;
        case '2d':
            stats_retention = '24w';
        break;
        case '30d':
            stats_retention = 'inf';
        break;
    }

    // $('[data-plot]').hide();
    // $('[data-plot$="'+limit+'"]').show();

}

H1P_vps.plotYformatterBytes = function(value) {
    var storageQuantities = ["KBps", "MBps", "GBps", "TBps", "PBps"],
        val = value;

    for (var i=0; i < storageQuantities.length; i++){
        if (val <= 1024) {
            if (val % 1 === 0) {
                return val.toFixed() + storageQuantities[i] ;
            }
            return val.toFixed(2) + storageQuantities[i];
        }
        val = val / 1024;
    }

    return val.toFixed() + 'PB';
}

H1P_vps.drawPlot = function( id, labels, datasets, max, yformatter ){
    var ctx = document.getElementById(id).getContext('2d');
    var chart = new Chart(ctx, {
        type: 'line',
        data:{
        labels: labels,
            datasets: datasets
    },
        options: {
            scales: {
                yAxes: [{
                    ticks: {                
                        min: 0,
                        max: max,
                        callback: yformatter
                    }
                }],
                xAxes: [{
                    ticks: {
                        callback: function(value) {                            
                            var date = new Date(value);

                            var months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

                            //var year = date.getFullYear();
                            //var month = months[date.getMonth()];
                            var day = date.getDate();

                            var hours = date.getHours();
                            var minutes = "0" + date.getMinutes();
                            // var seconds = "0" + date.getSeconds();
                            
                            // Will display time in 10:30:23 format
                            return day + 'd ' + hours + ':' + minutes.substr(-2);
                        },
                    },
                }],
            }
        }
    });
}

H1P_vps.loadStatistics = function(){

    $('[data-stats-refresh]').prop('disabled', 1);
    $('[data-stats-refresh]').children('.fa').addClass('fa-spin');

    var from = new Date();
    from.setDate(from.getDate() - 2);

   var from_timestamp = from.getTime()/1000;

    $.when(
        H1PapiCall( service_id + '/statistics', 'GET', '', { from: from_timestamp * 1000 * 1000 * 1000, retention:stats_retention } )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_vps.printCPUstats( response.data.slice(-60), 'h' );
            H1P_vps.printNetworkStats( response.data.slice(-60), 'h' );
            H1P_vps.printStorageStats( response.data.slice(-60), 'h' );

            // if( response.data.cpu.avg.cpu_avg_2d.length > 1 ){
            //     H1P_vps.printCPUstats( response.data.cpu.avg.cpu_avg_2d.slice(-30), '2d' );
            //     H1P_vps.printNetworkStats( response.data.network.avg.network_avg_2d.slice(-30), '2d' );
            //     H1P_vps.printStorageStats( response.data.disk.avg.disk_avg_2d.slice(-30), '2d' );
            // }
            // else{
            //     $('[data-stats-limit]').find('option[value="2d"]').prop('disabled', 1);
            // }
            // if( response.data.cpu.avg.cpu_avg_30d.length > 1 ){
            //     H1P_vps.printCPUstats( response.data.cpu.avg.cpu_avg_30d.slice(-30), '30d' );
            //     H1P_vps.printNetworkStats( response.data.network.avg.network_avg_30d.slice(-30), '30d' );
            //     H1P_vps.printStorageStats( response.data.disk.avg.disk_avg_30d.slice(-30), '30d' );
            // }
            // else{
            //     $('[data-stats-limit]').find('option[value="30d"]').prop('disabled', 1);
            // }
        }
        else{
            H1P_vps.show_error( response );
        }
        
        $('[data-stats-refresh]').prop('disabled', 0);
        $('[data-stats-refresh]').children('.fa').removeClass('fa-spin');
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.printCPUstats = function(data, plot){

    // draw cpu usage chart
    var cpuData = data;
    var cpu_labels = [];
    var cpu_values = [];
    var max_value = 0;

    for (const key in cpuData) {
        if (cpuData.hasOwnProperty(key)) {
            const element = cpuData[key];
            
            if( element.Cpu == null ) continue;
            
            cpu_labels.push(new Date(Math.round(element.Timestamp / 1000 / 1000))); // converting from nanoS

            var value = Math.round(element.Cpu.Usage);

            cpu_values.push( value );

            if( value > max_value ){
                max_value = value;
            }

        }
    }

    if( max_value < 10 ){
        max_value += 10;
    }
    else if( max_value > 10 && max_value < 50 ){
        max_value += 10;
    }
    else if( max_value < 100 ){
        max_value = 100;
    }

    H1P_vps.drawPlot(
        'cpuChart_' + plot,
        cpu_labels,
        [{
            label: js_lang.cpu_usage,
            data: cpu_values,
            backgroundColor: 'transparent',
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 1
        }],
        max_value,
        function(value){
            return value + '%'
        }
    );
}

H1P_vps.printNetworkStats = function(data, plot){

    // draw network usage chart
    var labels = [];
    var values_read = [];
    var values_write = [];
    var max_value = 0;

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const element = data[key];
            
            if( element.Net == null ) continue;
            
            labels.push(new Date(Math.round(element.Timestamp / 1000 / 1000))); // converting from nanoS

            var value = Math.round(element.Net[0].Total.BytesIn / 1024);
            var value_write = Math.round(element.Net[0].Total.BytesOut / 1024);

            values_read.push( value );
            values_write.push( value_write );

            if( value > max_value ){
                max_value = value;
            }

            if( value_write > max_value ){
                max_value = value_write;
            }

        }
    }

    if( max_value < 50 ){
        max_value += 10;
    }
    else{
        max_value += 100;
    }

    H1P_vps.drawPlot(
        'networkChart_' + plot,
        labels,
        [{
            label: js_lang.network + '(' + js_lang.in + ')',
            data: values_read,
            backgroundColor: 'transparent',
            borderColor: 'blue',
            borderWidth: 1
        },
        {
            label: js_lang.network + '(' + js_lang.out + ')',
            data: values_write,
            backgroundColor: 'transparent',
            borderColor: 'green',
            borderWidth: 1  
        }
        ],
        max_value,
        H1P_vps.plotYformatterBytes
    );
}

H1P_vps.printStorageStats = function(data, plot){

    // draw network usage chart
    var labels = [];
    var values_read = [];
    var values_write = [];
    var max_value = 0;

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const element = data[key];
            
            if( element.HDD == null ) continue;

            labels.push(new Date(Math.round(element.Timestamp / 1000 / 1000))); // converting from nanoS

            var value = Math.round(element.HDD[0].Total.Read / 1024);
            var value_write = Math.round(element.HDD[0].Total.Write / 1024);

            values_read.push( value );
            values_write.push( value_write );

            if( value > max_value ){
                max_value = value;
            }

            if( value_write > max_value ){
                max_value = value_write;
            }

        }
    }

    if( max_value < 50 ){
        max_value += 10;
    }
    else{
        max_value += 100;
    }

    H1P_vps.drawPlot(
        'storageChart_' + plot,
        labels,
        [{
            label: js_lang.storage + '(' + js_lang.read + ')',
            data: values_read,
            backgroundColor: 'transparent',
            borderColor: 'blue',
            borderWidth: 1
        },
        {
            label: js_lang.storage + '(' + js_lang.write + ')',
            data: values_write,
            backgroundColor: 'transparent',
            borderColor: 'green',
            borderWidth: 1  
        }
        ],
        max_value,
        H1P_vps.plotYformatterBytes
    );
}

Date.prototype.yyyymmdd = function() {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = this.getDate().toString();
    var hh  = this.getHours().toString();
    var min  = this.getMinutes().toString();
    return yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]) + (hh[1]?hh:"0"+hh[0]) + (min[1]?min:"0"+min[0]); // padding
 };
 

//upgrade

H1P_vps.load_product_options = function(){
    $.when(
        H1PapiCall( 'options', 'GET', { productId: package_id }, {} )
    ).then(function(response){
        var $options_wrap = $('#upgrade_modal options');

        $options_wrap.html('');

        for (const key in response.data) {
            if( key == 'additionalDisks' ) continue;
            if (response.data.hasOwnProperty(key)) {
                
                const element = response.data[key];

                if( element.max <= 0 ) continue;
                if( element.min == element.max ) continue;

                var slider_val = selected_configs[element.name];

                var html = '';
                html += '<div class="" data-slider-wrap="'+ key +'" style="padding-bottom:20px;">';
                html += '<div>' + element.name + '</div>';
                html += '<div class="">';
                html += '<input data-slider-id="'+ key +'" type="text" data-slider-min="'+ element.min / element.step +'" data-slider-max="'+ element.max / element.step +'" data-slider-step="1" data-slider-value="'+ slider_val +'"/>';
                html += '</div>';
                html += '</div>';

                $options_wrap.append( html );

                config_multiplier[key] = element.step;
                upgrade_sliders[key] = $('[data-slider-id="'+ key +'"]').slider({
                    formatter: function(value) {
                        return value + ' x ' + ' ' + element.step + ' ' + element.unit;
                    }
                });
                
            }
        }
        
        $('[data-slider-id]').change(function(){
            H1P_vps.calc_upgrade_price();
        });
    },
    function(response){
        H1P_vps.show_error( response.responseJSON );
    }
    );
}

H1P_vps.calc_upgrade_price = function(){

    var send_data = H1P_vps.getUpgradeParams();

    $.when(
        H1PapiCall( service_id + '/calcUpdatePricing', 'POST', JSON.stringify(send_data), {} )
    ).then(function(response){
        $('[data-upgrade-error-alert]').hide();
        $('[data-upgrade-btn]').prop('disabled', 0);
        var $upgrade_wrap = $('#upgrade_modal');

        if( response.status == 'success' ){
            $upgrade_wrap.find('[data-upgrade-total]').html(response.data.total);
        }
        $('[data-upgrade-summary]').show();
    },
    function(response){
        $('[data-upgrade-btn]').prop('disabled', 1);
        $('[data-upgrade-error-alert] [data-error-messsage]').text( 'Message: ' + response.responseJSON.message );
        $('[data-upgrade-error-alert]').show();
        $('[data-upgrade-summary]').hide();
    }
    );
}

H1P_vps.service_upgrade = function(){

    var send_data = H1P_vps.getUpgradeParams();

    $.when(
        H1PapiCall( service_id + '', 'PATCH', JSON.stringify(send_data), {} )
    ).then(function(response){
        $('#upgrade_modal').find('[data-dismiss="modal"]').click();
        if( response.data.invoiceId > 0 ){
            location.href = system_url + '/viewinvoice.php?id=' + response.data.invoiceId;
        }
        else location.reload();
    },
    function(response){
        $('[data-upgrade-btn]').prop('disabled', 1);
        $('[data-upgrade-error-alert] [data-error-messsage]').text( 'Message: ' + response.responseJSON.message );
        $('[data-upgrade-error-alert]').show();
        $('[data-upgrade-summary]').hide();
    }
    );
}

H1P_vps.getUpgradeParams = function(){
    var send_data = {};
    send_data.additionalDisks = [];
    var ahdd_count = 1;

    for (const key in upgrade_sliders) {
        if (upgrade_sliders.hasOwnProperty(key)) {
            const element = upgrade_sliders[key];
            if( key.indexOf( 'ahdd' ) === 0 ){
                send_data.additionalDisks.push({key:ahdd_count++, value: upgrade_sliders[key].slider('getValue') * config_multiplier[key]});
            }
            else{
                send_data[key] = upgrade_sliders[key].slider('getValue') * config_multiplier[key];
            }
        }
    }

    return send_data;
}