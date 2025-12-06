<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Suppress PHP 8.5 deprecation warnings for PDO::MYSQL_ATTR_SSL_CA
// These warnings come from Laravel's vendor config and will be fixed in future Laravel updates
if (PHP_VERSION_ID >= 80500) {
    // Set up error handler to suppress specific warnings
    set_error_handler(function ($errno, $errstr, $errfile, $errline) {
        // Suppress only the specific PDO::MYSQL_ATTR_SSL_CA deprecation warnings
        if ($errno === E_DEPRECATED && 
            (strpos($errstr, 'PDO::MYSQL_ATTR_SSL_CA') !== false ||
             strpos($errstr, 'PDO: :MYSQL_ATTR_SSL_CA') !== false) &&
            strpos($errfile, 'vendor/laravel/framework/config/database.php') !== false) {
            return true; // Suppress this warning
        }
        return false; // Let other errors through
    }, E_DEPRECATED);
    
    // Use output buffering to filter out any warnings that slip through
    ob_start(function ($buffer) {
        // Remove the specific deprecation warnings from HTML output
        $buffer = preg_replace(
            '/<br\s*\/?>\s*<b>Deprecated<\/b>:\s*Constant PDO:\s*:MYSQL_ATTR_SSL_CA[^<]*<br\s*\/?>\s*/i',
            '',
            $buffer
        );
        $buffer = preg_replace(
            '/<br\s*\/?>\s*Deprecated:\s*Constant PDO:\s*:MYSQL_ATTR_SSL_CA[^<]*<br\s*\/?>\s*/i',
            '',
            $buffer
        );
        return $buffer;
    });
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());

