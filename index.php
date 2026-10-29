<?php
/**
 * CE Logistic Panel — XAMPP Apache Launcher & Auto-Redirect
 * Routes requests to the active Next.js Server on Port 8000.
 */

$port = 8000;
$host = '127.0.0.1';
$appUrl = "http://localhost:{$port}";

// Function to check if the port is responding
function isServerRunning($host, $port) {
    $connection = @fsockopen($host, $port, $errno, $errstr, 1);
    if (is_resource($connection)) {
        fclose($connection);
        return true;
    }
    return false;
}

$running = isServerRunning($host, $port);

// If user requested explicit launch or auto-wake
if (!$running && (isset($_GET['action']) && $_GET['action'] === 'start' || !isset($_GET['wait']))) {
    // Attempt auto-start in background
    $dir = __DIR__;
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        pclose(popen("start /B cmd /c \"cd /d {$dir} && set PORT={$port} && set NODE_ENV=production && node .next\\standalone\\server.js\" > NUL 2>&1", "r"));
    }
    // Give it a brief moment
    usleep(800000);
    $running = isServerRunning($host, $port);
}

if ($running) {
    header("Location: {$appUrl}/");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CE Logistic Panel — XAMPP Launcher</title>
    <meta http-equiv="refresh" content="2;url=index.php?wait=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #0f1420;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .card {
            background-color: #1a1f2e;
            border: 1px solid #2d3548;
            border-radius: 12px;
            padding: 32px;
            max-width: 480px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .badge {
            display: inline-block;
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 4px 10px;
            border-radius: 9999px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #ffffff;
        }
        p {
            font-size: 14px;
            color: #94a3b8;
            margin-bottom: 24px;
            line-height: 1.5;
        }
        .spinner {
            width: 44px;
            height: 44px;
            border: 3px solid #2d3548;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .btn:hover { background: #2563eb; }
        .meta {
            margin-top: 24px;
            font-size: 12px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Naval Dockyard ERP</div>
        <div class="spinner"></div>
        <h1>Initializing CE Logistic Panel</h1>
        <p>Starting the background application service on port <?= $port ?>.<br>You will be redirected automatically once ready...</p>
        <div>
            <a href="index.php?action=start" class="btn">Retry Launch</a>
        </div>
        <div class="meta">
            Target Host: <span style="color: #60a5fa;">http://localhost:<?= $port ?></span>
        </div>
    </div>
</body>
</html>
