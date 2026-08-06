<?php
declare(strict_types=1);

set_time_limit(100);

const AI_PROXY_MAX_BODY_BYTES = 65536;
const AI_PROXY_MAX_TOKENS = 2000;
const AI_PROXY_ALLOWED_MODELS = [
    'gpt-4.1-mini',
    'gpt-4o-mini',
];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    jsonOut(['error' => ['message' => 'Method Not Allowed']], 405);
}

$contentType = strtolower(trim((string)($_SERVER['CONTENT_TYPE'] ?? '')));
if (!isAcceptedContentType($contentType)) {
    jsonOut(['error' => ['message' => 'Unsupported Content-Type']], 415);
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > AI_PROXY_MAX_BODY_BYTES) {
    jsonOut(['error' => ['message' => 'Request body too large']], 413);
}

$rawBody = file_get_contents('php://input');
if (!is_string($rawBody) || $rawBody === '') {
    jsonOut(['error' => ['message' => 'Invalid request body']], 400);
}
if (strlen($rawBody) > AI_PROXY_MAX_BODY_BYTES) {
    jsonOut(['error' => ['message' => 'Request body too large']], 413);
}

$body = json_decode($rawBody, true);
if (!is_array($body)) {
    jsonOut(['error' => ['message' => 'Invalid JSON']], 400);
}

$forbiddenKeys = ['token', 'gas_url', 'gasUrl', 'gas_proxy_url', 'endpoint', 'api_url', 'apiUrl'];
foreach ($forbiddenKeys as $forbiddenKey) {
    if (array_key_exists($forbiddenKey, $body)) {
        jsonOut(['error' => ['message' => 'Invalid request payload']], 400);
    }
}

$validated = validatePayload($body);
if (!$validated['ok']) {
    jsonOut(['error' => ['message' => $validated['message']]], $validated['status']);
}

$config = loadProxyConfig();
if ($config === null) {
    jsonOut(['error' => ['message' => 'Proxy configuration is unavailable']], 500);
}

$payload = [
    'model' => $validated['payload']['model'],
    'max_tokens' => $validated['payload']['max_tokens'],
    'system' => $validated['payload']['system'],
    'messages' => $validated['payload']['messages'],
    'token' => $config['ACCESS_TOKEN'],
];

$gasResult = postJsonToGas($config['GAS_URL'], $payload);
if (!$gasResult['ok']) {
    jsonOut(['error' => ['message' => $gasResult['message']]], $gasResult['status']);
}

jsonOut($gasResult['decoded'], $gasResult['status']);

function isAcceptedContentType(string $contentType): bool
{
    if ($contentType === '') {
        return false;
    }
    return str_starts_with($contentType, 'application/json') || str_starts_with($contentType, 'text/plain');
}

function validatePayload(array $body): array
{
    $required = ['model', 'max_tokens', 'system', 'messages'];
    foreach ($required as $key) {
        if (!array_key_exists($key, $body)) {
            return ['ok' => false, 'status' => 400, 'message' => 'Missing required fields'];
        }
    }

    if (!is_string($body['model']) || !in_array($body['model'], AI_PROXY_ALLOWED_MODELS, true)) {
        return ['ok' => false, 'status' => 400, 'message' => 'Unsupported model'];
    }

    if (!is_int($body['max_tokens']) && !ctype_digit((string)$body['max_tokens'])) {
        return ['ok' => false, 'status' => 400, 'message' => 'Invalid max_tokens'];
    }
    $maxTokens = (int)$body['max_tokens'];
    if ($maxTokens < 1 || $maxTokens > AI_PROXY_MAX_TOKENS) {
        return ['ok' => false, 'status' => 400, 'message' => 'max_tokens exceeds limit'];
    }

    if (!is_string($body['system'])) {
        return ['ok' => false, 'status' => 400, 'message' => 'Invalid system'];
    }

    if (!is_array($body['messages'])) {
        return ['ok' => false, 'status' => 400, 'message' => 'Invalid messages'];
    }

    return [
        'ok' => true,
        'payload' => [
            'model' => $body['model'],
            'max_tokens' => $maxTokens,
            'system' => $body['system'],
            'messages' => $body['messages'],
        ],
    ];
}

function loadProxyConfig(): ?array
{
    $configPath = dirname(__DIR__, 2) . '/script/touhokunedi-ai-config.php';
    if (!is_file($configPath) || !is_readable($configPath)) {
        return null;
    }

    $config = require $configPath;
    if (!is_array($config)) {
        return null;
    }

    $gasUrl = trim((string)($config['GAS_URL'] ?? ''));
    $accessToken = trim((string)($config['ACCESS_TOKEN'] ?? ''));
    if ($gasUrl === '' || $accessToken === '') {
        return null;
    }

    return [
        'GAS_URL' => $gasUrl,
        'ACCESS_TOKEN' => $accessToken,
    ];
}

function postJsonToGas(string $gasUrl, array $payload): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'status' => 502, 'message' => 'Upstream request failed'];
    }

    $ch = curl_init($gasUrl);
    if ($ch === false) {
        return ['ok' => false, 'status' => 502, 'message' => 'Upstream request failed'];
    }

    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payloadJson === false) {
        curl_close($ch);
        return ['ok' => false, 'status' => 500, 'message' => 'Failed to encode payload'];
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json; charset=utf-8',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS => $payloadJson,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
    ]);

    $response = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        if ($errno === CURLE_OPERATION_TIMEDOUT) {
            return ['ok' => false, 'status' => 504, 'message' => 'Upstream timeout'];
        }
        return ['ok' => false, 'status' => 502, 'message' => 'Upstream request failed'];
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'status' => 502, 'message' => 'Upstream returned invalid JSON'];
    }

    if ($status < 100 || $status > 599) {
        $status = 502;
    }

    return [
        'ok' => true,
        'status' => $status,
        'decoded' => $decoded,
    ];
}

function jsonOut(array $body, int $status): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
