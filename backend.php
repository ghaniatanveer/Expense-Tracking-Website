<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const FILE_MAP = [
    'categories' => 'categories.json',
    'expenses' => 'expenses.json',
    'recurring' => 'recurring.json',
    'settings' => 'settings.json'
];

function respond(int $status, bool $success, string $message, $data = null): void
{
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_PRETTY_PRINT);
    exit;
}

function ensureFile(string $entity): string
{
    if (!array_key_exists($entity, FILE_MAP)) {
        respond(404, false, 'Unknown entity');
    }

    $file = __DIR__ . DIRECTORY_SEPARATOR . FILE_MAP[$entity];
    if (!file_exists($file)) {
        $seed = $entity === 'settings'
            ? ['currency' => 'USD', 'theme' => 'light', 'default_view' => 'dashboard', 'monthly_budget_limit' => 0]
            : [];
        file_put_contents($file, json_encode($seed, JSON_PRETTY_PRINT));
    }
    return $file;
}

function readData(string $entity)
{
    $file = ensureFile($entity);
    $content = file_get_contents($file);
    if ($content === false || $content === '') {
        return $entity === 'settings'
            ? ['currency' => 'USD', 'theme' => 'light', 'default_view' => 'dashboard', 'monthly_budget_limit' => 0]
            : [];
    }
    $decoded = json_decode($content, true);
    if ($decoded === null) {
        respond(500, false, "Invalid JSON in {$entity} storage");
    }
    return $decoded;
}

function writeData(string $entity, $data): void
{
    $file = ensureFile($entity);
    $ok = file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
    if ($ok === false) {
        respond(500, false, "Unable to write {$entity} storage");
    }
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        respond(400, false, 'Invalid JSON request body');
    }
    return $json;
}

function validateEntityPayload(string $entity, array $payload): void
{
    $requiredByEntity = [
        'categories' => ['name', 'color'],
        'expenses' => ['name', 'amount', 'category_id', 'date'],
        'recurring' => ['name', 'amount', 'category_id', 'period', 'next_date'],
        'settings' => ['currency', 'theme', 'default_view', 'monthly_budget_limit']
    ];

    foreach ($requiredByEntity[$entity] as $field) {
        if (!array_key_exists($field, $payload)) {
            respond(422, false, "Missing required field: {$field}");
        }
    }

    if (($entity === 'expenses' || $entity === 'recurring') && !is_numeric($payload['amount'])) {
        respond(422, false, 'Amount must be numeric');
    }
}

function nextId(array $items): int
{
    if (empty($items)) {
        return 1;
    }
    $ids = array_map(static function ($item) {
        return (int)($item['id'] ?? 0);
    }, $items);
    return max($ids) + 1;
}

function updateRecurringDates(array $recurringItems, string $recurringId, string $period): array
{
    foreach ($recurringItems as &$item) {
        if ((string)($item['id'] ?? '') === (string)$recurringId) {
            $current = new DateTime($item['next_date']);
            $current->modify($period === 'weekly' ? '+7 day' : '+1 month');
            $item['next_date'] = $current->format('Y-m-d');
            break;
        }
    }
    return $recurringItems;
}

$entity = $_GET['entity'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

if ($entity === 'reports' && $method === 'GET') {
    $expenses = readData('expenses');
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $filtered = array_values(array_filter($expenses, static function ($expense) use ($from, $to) {
        $date = $expense['date'] ?? '';
        if ($from && $date < $from) {
            return false;
        }
        if ($to && $date > $to) {
            return false;
        }
        return true;
    }));
    $total = array_reduce($filtered, static function ($sum, $item) {
        return $sum + (float)($item['amount'] ?? 0);
    }, 0.0);
    respond(200, true, 'Report generated', ['items' => $filtered, 'total' => $total]);
}

if ($entity === 'recurring-run' && $method === 'POST') {
    $today = date('Y-m-d');
    $expenses = readData('expenses');
    $recurring = readData('recurring');
    $inserted = [];

    foreach ($recurring as $item) {
        if (($item['next_date'] ?? '') <= $today) {
            $expense = [
                'id' => nextId($expenses),
                'name' => $item['name'],
                'amount' => (float)$item['amount'],
                'category_id' => (int)$item['category_id'],
                'date' => $today,
                'notes' => 'Auto-generated recurring expense',
                'tags' => ['recurring'],
                'is_recurring' => true,
                'recurring_period' => $item['period']
            ];
            $expenses[] = $expense;
            $inserted[] = $expense;
            $recurring = updateRecurringDates($recurring, (string)$item['id'], (string)$item['period']);
        }
    }

    writeData('expenses', $expenses);
    writeData('recurring', $recurring);
    respond(200, true, 'Recurring run completed', ['created' => $inserted]);
}

if (!array_key_exists($entity, FILE_MAP)) {
    respond(404, false, 'Endpoint not found');
}

$payload = getJsonBody();
$data = readData($entity);

if ($method === 'GET') {
    if ($entity === 'settings') {
        respond(200, true, 'Fetched settings', $data);
    }
    if ($id === null) {
        respond(200, true, "Fetched {$entity}", $data);
    }
    foreach ($data as $item) {
        if ((string)($item['id'] ?? '') === (string)$id) {
            respond(200, true, "Fetched {$entity} item", $item);
        }
    }
    respond(404, false, 'Item not found');
}

if ($method === 'POST') {
    if ($entity === 'settings') {
        validateEntityPayload($entity, $payload);
        writeData('settings', $payload);
        respond(201, true, 'Settings saved', $payload);
    }
    validateEntityPayload($entity, $payload);
    $payload['id'] = nextId($data);
    if ($entity === 'expenses') {
        $payload['amount'] = (float)$payload['amount'];
        $payload['is_recurring'] = (bool)($payload['is_recurring'] ?? false);
        $payload['tags'] = array_values($payload['tags'] ?? []);
        $payload['recurring_period'] = $payload['recurring_period'] ?? null;
    }
    if ($entity === 'categories') {
        $payload['budget_monthly'] = (float)($payload['budget_monthly'] ?? 0);
    }
    if ($entity === 'recurring') {
        $payload['amount'] = (float)$payload['amount'];
    }
    $data[] = $payload;
    writeData($entity, $data);
    respond(201, true, ucfirst($entity) . ' created', $payload);
}

if ($method === 'PUT') {
    if ($entity === 'settings') {
        $merged = array_merge($data, $payload);
        validateEntityPayload($entity, $merged);
        writeData('settings', $merged);
        respond(200, true, 'Settings updated', $merged);
    }
    if ($id === null) {
        respond(400, false, 'Missing id');
    }
    $found = false;
    foreach ($data as &$item) {
        if ((string)($item['id'] ?? '') === (string)$id) {
            $item = array_merge($item, $payload, ['id' => (int)$id]);
            if ($entity === 'expenses' || $entity === 'recurring') {
                $item['amount'] = (float)$item['amount'];
            }
            if ($entity === 'categories') {
                $item['budget_monthly'] = (float)($item['budget_monthly'] ?? 0);
            }
            $found = true;
            break;
        }
    }
    if (!$found) {
        respond(404, false, 'Item not found');
    }
    writeData($entity, $data);
    respond(200, true, ucfirst($entity) . ' updated');
}

if ($method === 'DELETE') {
    if ($id === null) {
        respond(400, false, 'Missing id');
    }
    $beforeCount = is_array($data) ? count($data) : 0;
    $data = array_values(array_filter($data, static function ($item) use ($id) {
        return (string)($item['id'] ?? '') !== (string)$id;
    }));
    if (count($data) === $beforeCount) {
        respond(404, false, 'Item not found');
    }
    writeData($entity, $data);
    respond(200, true, ucfirst($entity) . ' deleted');
}

respond(405, false, 'Method not allowed');
