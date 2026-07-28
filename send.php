<?php
/**
 * Приём заявок с сайта и отправка в Telegram.
 *
 * НАСТРОЙКА (2 значения, инструкция — в файле TELEGRAM.md):
 *   1) TELEGRAM_BOT_TOKEN — токен бота от @BotFather
 *   2) TELEGRAM_CHAT_ID   — ID чата, куда слать заявки
 *
 * Значения можно задать здесь или в файле config.php рядом (он не в репозитории).
 */

declare(strict_types=1);

$config = [
    'bot_token' => '',              // ← вставьте токен бота
    'chat_id'   => '',              // ← вставьте chat_id
    'email_to'  => 'a.taskaev@tsr-gr.ru', // дублировать заявку на почту (пусто — не дублировать)
    'site_name' => 'taskaev.ru',
];

// Локальный config.php перекрывает значения выше (удобно не хранить токен в коде)
if (is_file(__DIR__ . '/config.php')) {
    $local = require __DIR__ . '/config.php';
    if (is_array($local)) {
        $config = array_merge($config, $local);
    }
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed', 405);
}

/* ---------- Антиспам ---------- */

// 1. Honeypot: скрытое поле, которое заполняют только боты
if (trim((string)($_POST['website'] ?? '')) !== '') {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE); // тихо игнорируем
    exit;
}

// 2. Форму нельзя отправить быстрее, чем за 3 секунды после загрузки
$elapsed = (int)($_POST['elapsed'] ?? 0);
if ($elapsed > 0 && $elapsed < 3) {
    fail('Слишком быстрая отправка', 429);
}

// 3. Не чаще одной заявки в 30 секунд с одного адреса
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$throttleFile = sys_get_temp_dir() . '/lead_' . md5($ip) . '.lock';
if (is_file($throttleFile) && (time() - (int)filemtime($throttleFile)) < 30) {
    fail('Заявка уже отправлена, попробуйте чуть позже', 429);
}

/* ---------- Данные формы ---------- */

function field(string $key, int $max = 500): string
{
    $value = trim((string)($_POST[$key] ?? ''));
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    if (function_exists('mb_substr')) {
        $value = mb_substr($value, 0, $max, 'UTF-8');
    } else {
        $value = substr($value, 0, $max);
    }
    return $value;
}

$name    = field('name', 120);
$company = field('company', 160);
$contact = field('contact', 160);
$message = field('message', 3000);
$consent = trim((string)($_POST['consent'] ?? ''));

if ($name === '' || $contact === '' || $message === '') {
    fail('Заполните имя, контакт и описание задачи');
}
if ($consent === '') {
    fail('Требуется согласие на обработку персональных данных');
}

/* ---------- Отправка в Telegram ---------- */

$lines = [
    '📩 <b>Новая заявка с сайта</b>',
    '',
    '<b>Имя:</b> ' . htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
];
if ($company !== '') {
    $lines[] = '<b>Компания:</b> ' . htmlspecialchars($company, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
$lines[] = '<b>Контакт:</b> ' . htmlspecialchars($contact, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$lines[] = '';
$lines[] = '<b>Задача:</b>';
$lines[] = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$lines[] = '';
$lines[] = '<i>' . $config['site_name'] . ' · ' . date('d.m.Y H:i') . '</i>';

$text = implode("\n", $lines);

$sent = false;
$error = '';

if ($config['bot_token'] !== '' && $config['chat_id'] !== '') {
    $payload = http_build_query([
        'chat_id'    => $config['chat_id'],
        'text'       => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => 'true',
    ]);
    $url = 'https://api.telegram.org/bot' . $config['bot_token'] . '/sendMessage';

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 12,
        ]);
        $response = curl_exec($ch);
        $status   = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false) {
            $error = curl_error($ch);
        }
        curl_close($ch);
        $sent = ($status === 200);
    } else {
        $context = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content'       => $payload,
                'timeout'       => 12,
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        $sent = ($response !== false && str_contains((string)$response, '"ok":true'));
    }
} else {
    $error = 'Telegram не настроен';
}

/* ---------- Дублирование на почту ---------- */

if (!empty($config['email_to'])) {
    $subject = 'Заявка с сайта — ' . $name . ($company !== '' ? ', ' . $company : '');
    $body    = "Имя: {$name}\nКомпания: {$company}\nКонтакт: {$contact}\n\nЗадача:\n{$message}\n\n"
             . "Отправлено: " . date('d.m.Y H:i') . " · IP: {$ip}";
    $headers = "From: no-reply@" . preg_replace('/[^a-z0-9.\-]/i', '', $config['site_name']) . "\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n";
    $mailed = @mail($config['email_to'], $subject, $body, $headers);
    $sent = $sent || $mailed;
}

if (!$sent) {
    fail('Не удалось отправить заявку' . ($error !== '' ? ': ' . $error : ''), 502);
}

@touch($throttleFile);
echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
