<?php
/**
 * Neptune.ly — quotation/contact form handler.
 * Hardened: POST-only, same-origin, honeypot, time-trap, rate-limited,
 * header-injection-proof, length-capped. Sends to info@neptune.ly.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAIL_TO   = 'info@neptune.ly';
const MAIL_FROM = 'website@neptune.ly';
const RATE_MAX  = 5;        // submissions
const RATE_WIN  = 3600;     // per hour per IP
const MIN_MS    = 3000;     // human time-trap

function fail(int $code, string $why = 'rejected'): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $why]);
    exit;
}

/* ── method ── */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'method');
}

/* ── same-origin (Origin or Referer must match our host when present) ── */
$host = strtolower($_SERVER['HTTP_HOST'] ?? '');
foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $h) {
    if (!empty($_SERVER[$h])) {
        $oh = strtolower((string) parse_url($_SERVER[$h], PHP_URL_HOST));
        if ($oh !== $host && $oh !== 'www.' . $host && 'www.' . $oh !== $host) {
            fail(403, 'origin');
        }
        break;
    }
}

/* ── honeypot + time-trap ── */
if (!empty($_POST['website'])) {
    // Bots fill this; pretend success so they move on.
    echo json_encode(['ok' => true]);
    exit;
}
$elapsed = (int) ($_POST['elapsed'] ?? 0);
if ($elapsed > 0 && $elapsed < MIN_MS) {
    fail(429, 'too-fast');
}

/* ── rate limit (file bucket per IP) ── */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$bucket = sys_get_temp_dir() . '/npt-contact-' . hash('sha256', $ip . date('YmdH'));
$count = is_file($bucket) ? (int) file_get_contents($bucket) : 0;
if ($count >= RATE_MAX) {
    fail(429, 'rate');
}
@file_put_contents($bucket, (string) ($count + 1), LOCK_EX);

/* ── input ── */
function clean(string $key, int $max): string {
    $v = trim((string) ($_POST[$key] ?? ''));
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);           // header injection
    if (function_exists('mb_substr')) {
        return mb_substr($v, 0, $max, 'UTF-8');
    }
    return substr($v, 0, $max);
}

$name  = clean('name', 120);
$org   = clean('organization', 160);
$email = clean('email', 160);
$phone = clean('phone', 40);
$topic = clean('topic', 40);
$msg   = trim((string) ($_POST['message'] ?? ''));
$msg   = str_replace("\0", '', $msg);
if (function_exists('mb_substr')) {
    $msg = mb_substr($msg, 0, 4000, 'UTF-8');
} else {
    $msg = substr($msg, 0, 4000);
}

if ($name === '' || $msg === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(422, 'validation');
}
$topics = ['mobile','middleware','onboarding','aml','pos','payments','design','other'];
if (!in_array($topic, $topics, true)) {
    $topic = 'other';
}

/* ── compose ── */
$subject = '=?UTF-8?B?' . base64_encode("Quotation request [{$topic}] — {$name}") . '?=';
$bodyLines = [
    "New request from neptune.ly",
    str_repeat('-', 46),
    "Name:          {$name}",
    "Organization:  {$org}",
    "Email:         {$email}",
    "Phone:         {$phone}",
    "Topic:         {$topic}",
    "IP:            {$ip}",
    "Time (UTC):    " . gmdate('Y-m-d H:i:s'),
    str_repeat('-', 46),
    "",
    $msg,
];
$body = implode("\r\n", $bodyLines);

$headers = [
    'From: Neptune Website <' . MAIL_FROM . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: neptune.ly',
];

$sent = @mail(MAIL_TO, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if (!$sent) {
    fail(500, 'mail');
}
echo json_encode(['ok' => true]);
