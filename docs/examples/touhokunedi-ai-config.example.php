<?php
/**
 * Sample private config for AI proxy.
 *
 * Place the real config file OUTSIDE public_html at:
 *   touhokunedi.com/script/touhokunedi-ai-config.php
 *
 * ai-proxy-TN.php resolves it via:
 *   dirname(__DIR__, 2) . '/script/touhokunedi-ai-config.php'
 *
 * Do not commit the real file with secret values.
 */

return [
    'GAS_URL' => 'https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec',
    'ACCESS_TOKEN' => 'REPLACE_WITH_SECURE_RANDOM_TOKEN',
];
