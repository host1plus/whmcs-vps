var rfb;
var vnc_state;
var vps_console_resizeTimeout;
var vps_console_desktopName;
function vps_console_UIresize() {
    $('#noVNC_canvas').css('width','100%').css('height','auto').css('margin-bottom','-5px');
    return;
    // innerW = window.innerWidth;
    // innerH = window.innerHeight;
    // controlbarH = document.getElementById('noVNC_status_bar').offsetHeight;
    
    // if (innerW !== undefined && innerH !== undefined)
    //     window.rfb.requestDesktopSize(innerW, innerH - controlbarH);
}

function vps_console_FBUComplete(rfb, fbu){
    vps_console_UIresize();
    rfb.set_onFBUComplete(function() { });
}
function vps_console_updateDesktopName(rfb, name){
    vps_console_desktopName = name;
}
function vps_console_passwordRequired(rfb, msg){
    console.log( 'Password required' );
    /*if (typeof msg === 'undefined') {
        msg = 'Password Required: ';
    }
    var html;
    var form = document.createElement('form');
    form.style = 'margin-bottom: 0px';
    form.innerHTML = '<label></label>'
    form.innerHTML += '<input type=password size=10 id="password_input" class="noVNC_status">';
    form.onsubmit = setPassword;
    // bypass status() because it sets text content
    document.getElementById('noVNC_status_bar').setAttribute("class", "noVNC_status_warn");
    document.getElementById('noVNC_status').innerHTML = '';
    document.getElementById('noVNC_status').appendChild(form);
    document.getElementById('noVNC_status').querySelector('label').textContent = msg;*/
}


function vps_console_setPassword() {
    window.rfb.sendPassword(document.getElementById('password_input').value);
    return false;
}
function vps_console_sendCtrlAltDel() {
    window.rfb.sendCtrlAltDel();
    return false;
}
function vps_console_xvpShutdown() {
    window.rfb.xvpShutdown();
    return false;
}
function vps_console_xvpReboot() {
    window.rfb.xvpReboot();
    return false;
}
function vps_console_xvpReset() {
    window.rfb.xvpReset();
    return false;
}
function vps_console_status(text, level) {
    switch (level) {
        case 'normal':
        case 'warn':
        case 'error':
            break;
        default:
            level = "warn";
    }
    document.getElementById('noVNC_status_bar').setAttribute("class", "noVNC_status_" + level);
    document.getElementById('noVNC_status').textContent = text;
}

function vps_console_updateState(rfb, state, oldstate){
    vnc_state = state;
    switch (state) {
        case 'connecting':
            vps_console_status("Connecting", "normal");
            break;
        case 'connected':
        case 'normal':
            show_vnc_block();
            if (rfb && rfb.get_encrypt()) {
                vps_console_status("Connected (encrypted) to " +
                        vps_console_desktopName, "normal");
            } else {
                vps_console_status("Connected (unencrypted) to " +
                        vps_console_desktopName, "normal");
            }
            // small workaround to redraw console once started
            window.rfb.clipboardPasteFrom('');
            vps_vnc_focus( $('#novnc_state_border') );
            break;
        case 'disconnecting':
            vps_console_status("Disconnecting", "normal");
            break;
        case 'disconnected':
            vps_console_status("Disconnected", "normal");
            //hide_vnc_block();
            break;
        default:
            vps_console_status(state, "warn");
            break;
    }
    
    if (state === 'connected' || state === 'normal') {
        //do smth on connected
    } else {
        vps_console_xvpInit(0);
    }
}
function vps_console_disconnected(rfb, reason){
    //console.log('on disconnected' )
    if (typeof(reason) !== 'undefined') {
        vps_console_status(reason, "error");
    }
}
function vps_console_notification(rfb, msg, level, options){
    vps_console_status(msg, level);
}

function vps_console_xvpInit(ver){
    /*var xvpbuttons;
    xvpbuttons = document.getElementById('noVNC_xvp_buttons');
    if (ver >= 1) {
        xvpbuttons.style.display = 'inline';
    } else {
        xvpbuttons.style.display = 'none';
    }*/
}
function vps_console_connect(){
    console.log('show connect')
    show_vnc_block();

    try {
        window.rfb = new window.noVNC.RFB({
            'target'            : document.getElementById('noVNC_canvas'),
            'encrypt'           : 1,
            'onNotification'    : vps_console_notification,
            'onUpdateState'     : vps_console_updateState,
            'onDisconnected'    : vps_console_disconnected,
            'onXvpInit'         : vps_console_xvpInit,
            'onPasswordRequired': vps_console_passwordRequired,
            'onFBUComplete'     : vps_console_FBUComplete,
            'onDesktopName'     : vps_console_updateDesktopName
        });
    } catch (exc) {
        vps_console_status('Unable to create RFB client -- ' + exc, 'error');
        return; // don't continue trying to connect
    }
    //console.log("InstanceData = ", instance_data);
    
    //window.rfb.connect('wss://devvz-ovz1:5702', 'd79kTKRr', '');
    window.rfb.connect('wss://'+vnc.address+":"+vnc.port, vnc.password, ''); // last param = 'path'

}
function vps_console_disconnect(){
    if( vnc.state === 'running' ){
        if( typeof window.rfb !== 'undefined' ){
            //console.log('disconnecting vnc')
            vps_vnc_defocus( $('#novnc_state_border') );
            window.rfb.disconnect();
        }

        //vps_vnc_disable(); // vps disable task
    }
}

function vnc_load(){
    return $.when(
        H1PapiCall( service_id + '/vnc', 'GET', {}, {})
    ).then(function(response){
        if( typeof response.data !== 'undefined' ){
            vnc = response.data;
            $('[data-vnc-loader-wrap]').hide();

            if( vnc.state === 'running' ){
                vps_console_connect();
            }
        }
    },
    function(response){
    }
    );
}

function hide_vnc_block(){
    $('#noVNC_status_bar').hide();
    $('#noVNC_container').hide();
    $('[data-vnc-container]').hide();
}

function show_vnc_block(){
    $('#noVNC_status_bar').show();
    $('#noVNC_container').show();
    $('[data-vnc-container]').show();
}

$(document).off('click.clipboard').on('click.clipboard', function (e) {
    
    if (vnc_state !== 'normal') {
        return;
    }

    var $obj = $(e.target);
    var $container = $('#novnc_state_border');

    if ($obj.attr('id') === 'noVNC_canvas') {
        vps_vnc_focus( $container );
    } else {
        vps_vnc_defocus( $container );
    }
});

function vps_vnc_focus( $container ){
    window.rfb.get_keyboard().grab();
    $container.closest('.modal-plain-content').attr('not-close-esc','');
    $container.css('border-color', '#b3ff00');
}
function vps_vnc_defocus( $container ){
    window.rfb.get_keyboard().ungrab();
    $container.closest('.modal-plain-content').removeAttr('not-close-esc');
    $container.css('border-color', 'white');
}