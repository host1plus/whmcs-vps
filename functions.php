<?php

require_once __DIR__ . '/vendor/autoload.php';

// clients
use \WHMCS\Database\Capsule;

// enums / interfaces
use \Host1Plus\Enums\{Errors, ServiceStates};

function h1pvps_getApiUrlKey()
{
    try
    {
        $addonSettings = Capsule::table('tbladdonmodules')->where('module', 'h1papi')->whereIn('setting', ['option1', 'option2'])->pluck('value', 'setting');
        if (count($addonSettings) != 2)
            return ['', '', 'Host1Plus API Addon Module is not configured: failed to retrieve API URL and Key parameters'];

        return [$addonSettings['option1'], $addonSettings['option2'], ''];
    }
    catch (Exception $ex)
    {
        return ['', '', sprintf('failed to retrieve Host1Plus API Addon Modules settings, error: %s, message: %s', get_class($ex), $ex->getMessage())];
    }
}

function h1pvps_validateConfigOpts(array $opts)
{
    if (!array_key_exists('HDD', $opts))
        return sprintf(Errors::InvalidParameter, 'HDD', 'above 0', 'none');

    if (!array_key_exists('CPU', $opts))
        return sprintf(Errors::InvalidParameter, 'CPU count', 'above 0', 'none');

    if (!array_key_exists('RAM', $opts))
        return sprintf(Errors::InvalidParameter, 'RAM', 'above 0', 'none');

    if (!array_key_exists('IP', $opts))
        return sprintf(Errors::InvalidParameter, 'IP count', 'above 0', 'none');

    if (!array_key_exists('Backups', $opts))
        return sprintf(Errors::InvalidParameter, 'Backup count', 'integer value', 'none');

    if (!array_key_exists('Bandwidth', $opts))
        return sprintf(Errors::InvalidParameter, 'Bandwidth', 'integer value', 'none');

    if (!array_key_exists('Network Rate', $opts))
        return sprintf(Errors::InvalidParameter, 'Network Rate', 'above 0', 'none');

    return true;
}

function h1pvps_logErrParam($action, array $params, $param, $expected, $got)
{
    $errstr = sprintf(Errors::InvalidParameter, $param, $expected, $got);
    logModuleCall('h1pvps', $action, $params, $errstr, '');
    return $errstr;
}

function h1pvps_validateParamsForSimpleAction(array $params)
{
    if ($params['status'] != ServiceStates::Active)
        return sprintf(Errors::InvalidParameter, 'service state', ServiceStates::Active, $params['status']);

    if ( ($errstr = h1pvps_validateServerParams($params)) !== true )
        return $errstr;

    if (!array_key_exists('id', $params['customfields']))
        return sprintf(Errors::InvalidParameter, 'id', 'int above 0', 'non');

    return true;
}

function h1pvps_logErrAction($action, $params, Exception $ex)
{
    $errstr = sprintf(Errors::Action, $action, get_class($ex), $ex->getMessage());
    logModuleCall('h1pvps', $action, $params, $errstr, '');
    return $errstr;
}

function h1pvps_canUpgrade()
{
    if (isset($_SESSION['h1pvps_upgradeParams']) && isset($_SESSION['upgradeids']))
    {
        if (count($_SESSION['upgradeids']) != count($_SESSION['h1pvps_upgradeParams']))
            return false;
        else
        {
            $pendingCount = Capsule::table('tblupgrades')->whereIn('id', $_SESSION['upgradeids'])->where('status', 'pending')->count();
            if ($pendingCount > 1)
                return false;

            unset($_SESSION['h1pvps_upgradeParams']);
        }
    }
    elseif (isset($_SESSION['upgradeids']))
    {
        $pendingCount = Capsule::table('tblupgrades')->whereIn('id', $_SESSION['upgradeids'])->where('status', 'pending')->count();
        if ($pendingCount > 1)
            return false;
    }

    return true;
}