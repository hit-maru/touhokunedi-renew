<?php
/**
 * 東北ネヂ製造株式会社
 * 記事画像アップローダー v2
 * 設置場所: /public_html/tools/uploader-TN.php
 */

session_start();

define('PUBLIC_ROOT',   realpath(__DIR__ . '/..') ?: dirname(__DIR__));
define('UPLOAD_BASE',   rtrim(PUBLIC_ROOT, '/') . '/uploads/news/');
define('UPLOAD_URL',    'https://touhokunedi.com/uploads/news/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_EXTS',  ['jpg', 'jpeg', 'png', 'webp']);
define('LOGIN_PASSWORD', 'nedzi2026tools');

define('BLOCK_TYPES', [
    'image0' => ['count' => 0, 'w' => 0,    'h' => 0,   'label' => '画像なし',  'layout' => 'テキストのみ'],
    'image1' => ['count' => 1, 'w' => 1200, 'h' => 630,  'label' => '画像1点',  'layout' => '横長1枚　1200×630px'],
    'image2' => ['count' => 2, 'w' => 600,  'h' => 400,  'label' => '画像2点',  'layout' => '2カラム　600×400px'],
    'image3' => ['count' => 3, 'w' => 400,  'h' => 300,  'label' => '画像3点',  'layout' => '3カラム　400×300px'],
    'image4' => ['count' => 4, 'w' => 600,  'h' => 400,  'label' => '画像4点',  'layout' => '2×2グリッド　600×400px'],
    'image6' => ['count' => 6, 'w' => 400,  'h' => 300,  'label' => '画像6点',  'layout' => '2×3ギャラリー　400×300px'],
]);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    if ($_POST['password'] === LOGIN_PASSWORD) { $_SESSION['authed'] = true; }
    else { $login_error = 'パスワードが違います。'; }
}
if (isset($_POST['action']) && $_POST['action'] === 'logout') {
    session_destroy(); header('Location: ' . $_SERVER['PHP_SELF']); exit;
}
$authed = !empty($_SESSION['authed']);

function uploadDebugContext($path = '') {
    $target = $path !== '' ? $path : UPLOAD_BASE;
    $parent = dirname(rtrim($target, '/'));
    $existingParent = $parent;
    while (!is_dir($existingParent) && dirname($existingParent) !== $existingParent) {
        $existingParent = dirname($existingParent);
    }
    return [
        'script_dir' => __DIR__,
        'public_root' => PUBLIC_ROOT,
        'upload_base' => UPLOAD_BASE,
        'target' => $target,
        'target_realpath' => realpath($target) ?: null,
        'parent' => $parent,
        'parent_realpath' => realpath($parent) ?: null,
        'parent_exists' => is_dir($parent),
        'parent_writable' => is_writable($parent),
        'existing_parent' => is_dir($existingParent) ? $existingParent : null,
        'existing_parent_realpath' => is_dir($existingParent) ? realpath($existingParent) : null,
        'existing_parent_writable' => is_dir($existingParent) ? is_writable($existingParent) : false,
        'target_exists' => is_dir($target),
        'target_writable' => is_dir($target) ? is_writable($target) : null,
    ];
}

function uploadLog($message, array $context = []) {
    error_log('[uploader-TN] ' . $message . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function uploadError($message, array $context = []) {
    uploadLog($message, $context);
    return ['ok' => false, 'msg' => $message, 'debug' => $context];
}

function ensureUploadDir($dir) {
    if (is_dir($dir)) {
        if (!is_writable($dir)) {
            return uploadError('保存先フォルダに書き込み権限がありません。', uploadDebugContext($dir));
        }
        return ['ok' => true, 'msg' => '保存先フォルダは既に存在します。', 'debug' => uploadDebugContext($dir)];
    }

    $parent = dirname(rtrim($dir, '/'));
    $existingParent = $parent;
    while (!is_dir($existingParent) && dirname($existingParent) !== $existingParent) {
        $existingParent = dirname($existingParent);
    }
    if (!is_dir($existingParent)) {
        return uploadError('保存先を作成するための親フォルダが存在しません。', uploadDebugContext($dir));
    }
    if (!is_writable($existingParent)) {
        return uploadError('保存先を作成するための親フォルダに書き込み権限がありません。', uploadDebugContext($dir));
    }

    $created = mkdir($dir, 0755, true);
    clearstatcache(true, $dir);
    if (!$created && !is_dir($dir)) {
        return uploadError('保存先フォルダの作成に失敗しました。', uploadDebugContext($dir) + ['mkdir_return' => $created]);
    }

    $htaccess = $dir . '.htaccess';
    $htaccessWritten = file_put_contents($htaccess, "Options -Indexes\n");
    if ($htaccessWritten === false) {
        return uploadError('保存先フォルダは作成できましたが、.htaccess の作成に失敗しました。', uploadDebugContext($dir) + ['mkdir_return' => $created]);
    }

    return ['ok' => true, 'msg' => '保存先フォルダを作成しました。', 'debug' => uploadDebugContext($dir) + ['mkdir_return' => $created]];
}

function uploadFileErrorMessage($errorCode) {
    $messages = [
        UPLOAD_ERR_INI_SIZE => 'アップロードファイルが PHP の upload_max_filesize を超えています。',
        UPLOAD_ERR_FORM_SIZE => 'アップロードファイルがフォームの MAX_FILE_SIZE を超えています。',
        UPLOAD_ERR_PARTIAL => 'ファイルが一部しかアップロードされませんでした。',
        UPLOAD_ERR_NO_FILE => 'アップロードファイルが選択されていません。',
        UPLOAD_ERR_NO_TMP_DIR => 'PHP の一時保存フォルダがありません。',
        UPLOAD_ERR_CANT_WRITE => 'PHP が一時保存フォルダへ書き込めませんでした。',
        UPLOAD_ERR_EXTENSION => 'PHP拡張によりアップロードが停止されました。',
    ];
    return $messages[$errorCode] ?? 'ファイルのアップロードに失敗しました。';
}

$api_response = null;
if ($authed && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'mkdir') {
        $date = preg_replace('/[^0-9\-]/', '', $_POST['date'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $api_response = ['ok' => false, 'msg' => '日付形式が不正です。'];
        } else {
            $dir = UPLOAD_BASE . $date . '/';
            $dirResult = ensureUploadDir($dir);
            if (!$dirResult['ok']) {
                $api_response = $dirResult;
            } else {
                $api_response = ['ok' => true, 'msg' => "フォルダを作成しました：/uploads/news/{$date}/", 'date' => $date, 'debug' => $dirResult['debug']];
            }
        }
    }
    if ($_POST['action'] === 'upload') {
        $date      = preg_replace('/[^0-9\-]/', '', $_POST['date'] ?? '');
        $seq       = intval($_POST['seq'] ?? 1);
        $blockType = $_POST['block_type'] ?? 'image1';
        if (!array_key_exists($blockType, BLOCK_TYPES)) $blockType = 'image1';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $api_response = ['ok' => false, 'msg' => '日付形式が不正です。'];
        } elseif (!isset($_FILES['image'])) {
            $api_response = uploadError('アップロードファイルが送信されていません。', uploadDebugContext());
        } elseif ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $api_response = uploadError(uploadFileErrorMessage($_FILES['image']['error']), uploadDebugContext() + ['file_error' => $_FILES['image']['error']]);
        } else {
            $file = $_FILES['image']; $tmp_path = $file['tmp_name'];
            $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->file($tmp_path);
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($mime, ALLOWED_TYPES)) {
                $api_response = ['ok' => false, 'msg' => 'jpg/png/webpのみ使用できます。'];
            } elseif ($file['size'] > MAX_FILE_SIZE) {
                $api_response = ['ok' => false, 'msg' => 'ファイルサイズが5MBを超えています。'];
            } else {
                $dir = UPLOAD_BASE . $date . '/';
                $dirResult = ensureUploadDir($dir);
                if (!$dirResult['ok']) {
                    $api_response = $dirResult;
                } else {
                    $seq_str = str_pad($seq, 2, '0', STR_PAD_LEFT);
                    $safe_ext = ($ext === 'jpeg') ? 'jpg' : $ext;
                    $filename = "{$date}-{$seq_str}.{$safe_ext}";
                    $dest = $dir . $filename;
                    $url = UPLOAD_URL . "{$date}/{$filename}";
                    $moved = move_uploaded_file($tmp_path, $dest);
                    if ($moved) {
                        $bconf = BLOCK_TYPES[$blockType];
                        if ($bconf['w'] > 0) resizeImage($dest, $safe_ext, $bconf['w'], $bconf['h']);
                        $api_response = ['ok' => true, 'msg' => "アップロード完了：{$filename}", 'url' => $url, 'filename' => $filename, 'seq' => $seq, 'block_type' => $blockType];
                    } else {
                        $api_response = uploadError('ファイルの保存に失敗しました。保存先パスまたは権限を確認してください。', uploadDebugContext($dir) + [
                            'tmp_path' => $tmp_path,
                            'tmp_uploaded_file' => is_uploaded_file($tmp_path),
                            'destination' => $dest,
                            'destination_dir_writable' => is_writable($dir),
                            'move_uploaded_file_return' => $moved,
                            'file_error' => $file['error'],
                        ]);
                    }
                }
            }
        }
    }
}

function resizeImage($path, $ext, $targetW, $targetH) {
    list($origW, $origH) = getimagesize($path);
    if (!$origW || !$origH) return;
    $ratio = min($targetW / $origW, $targetH / $origH);
    $newW = intval($origW * $ratio); $newH = intval($origH * $ratio);
    switch ($ext) {
        case 'jpg': $src = imagecreatefromjpeg($path); break;
        case 'png': $src = imagecreatefrompng($path); break;
        case 'webp': $src = imagecreatefromwebp($path); break;
        default: return;
    }
    if (!$src) return;
    $canvas = imagecreatetruecolor($targetW, $targetH);
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefill($canvas, 0, 0, $white);
    imagecopyresampled($canvas, $src, intval(($targetW-$newW)/2), intval(($targetH-$newH)/2), 0, 0, $newW, $newH, $origW, $origH);
    switch ($ext) {
        case 'jpg': imagejpeg($canvas, $path, 90); break;
        case 'png': imagepng($canvas, $path, 6); break;
        case 'webp': imagewebp($canvas, $path, 90); break;
    }
    imagedestroy($src); imagedestroy($canvas);
}

if ($api_response !== null && !empty($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    header('Content-Type: application/json');
    echo json_encode($api_response, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>記事画像アップローダー｜東北ネヂ製造株式会社</title>
<link rel="icon" type="image/png" href="https://touhokunedi.com/nedzi-mark.png">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --teal:#008B9B;--teal-dark:#006064;--teal-light:#e8f7f9;
  --gray-100:#f5f5f5;--gray-200:#e8e8e8;--gray-400:#aaa;
  --gray-600:#666;--gray-800:#333;--ink:#1A1A1A;--white:#fff;
  --radius:8px;--font:'Noto Sans JP',sans-serif;
}
body{font-family:var(--font);background:var(--gray-100);color:var(--ink);min-height:100vh;font-size:14px;}

/* topbar */
.topbar{background:var(--teal);display:flex;align-items:center;gap:14px;padding:0 24px;height:48px;}
.logo{font-size:10px;color:rgba(255,255,255,.7);letter-spacing:.12em;line-height:1.2;}
.logo b{display:block;font-size:14px;color:#fff;font-weight:500;}
.topbar-title{font-size:12px;color:rgba(255,255,255,.8);border-left:1px solid rgba(255,255,255,.3);padding-left:14px;}
.logout-btn{margin-left:auto;font-size:11px;color:rgba(255,255,255,.7);background:none;border:1px solid rgba(255,255,255,.3);padding:4px 12px;border-radius:20px;cursor:pointer;font-family:var(--font);}

/* ログイン */
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 48px);}
.login-box{background:var(--white);border-radius:12px;padding:40px;width:360px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
.login-box h2{font-size:16px;margin-bottom:6px;color:var(--teal);}
.login-box p{font-size:12px;color:var(--gray-400);margin-bottom:24px;}
.form-group{margin-bottom:16px;}
.form-group label{display:block;font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;}
.form-group input{width:100%;padding:10px 12px;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:14px;font-family:var(--font);outline:none;}
.form-group input:focus{border-color:var(--teal);}
.btn-primary{width:100%;padding:12px;background:var(--teal);color:#fff;border:none;border-radius:var(--radius);font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font);}
.error-msg{background:#fff0f0;border:1px solid #f5a0a0;border-radius:var(--radius);padding:10px 14px;font-size:12px;color:#c0392b;margin-bottom:16px;}

/* メイン */
.main{max-width:800px;margin:0 auto;padding:32px 24px;}

/* ステップ */
.step{background:var(--white);border-radius:12px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.step-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.step-num{width:30px;height:30px;border-radius:50%;background:var(--teal);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step-title{font-size:16px;font-weight:700;color:var(--gray-800);}

/* レイアウト選択カード（横スクロール） */
.layout-scroll{overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;}
.layout-row{display:flex;gap:12px;width:max-content;}

.layout-card{width:130px;border:2px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;transition:all .15s;background:var(--white);overflow:hidden;flex-shrink:0;}
.layout-card:hover{border-color:var(--teal);transform:translateY(-2px);}
.layout-card.active{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-light);}

/* サムネイル部分（縦長・記事イメージ） */
.lc-thumb{width:100%;padding:10px 10px 0;display:flex;flex-direction:column;gap:6px;min-height:140px;}

/* テキスト行（記事本文イメージ） */
.lc-textline{height:5px;background:var(--gray-200);border-radius:2px;}
.lc-textline.short{width:65%;}

/* 画像ブロックプレビュー */
.lc-img-area{display:grid;gap:4px;margin-bottom:6px;}
.lc-img{background:var(--gray-200);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:14px;}
.layout-card.active .lc-img{background:#b2dfe5;}
.layout-card.active .lc-textline{background:#b2dfe5;}

/* キャプション */
.lc-caption{padding:8px 10px;border-top:1px solid var(--gray-200);}
.lc-name{font-size:12px;font-weight:700;color:var(--gray-800);margin-bottom:2px;}
.lc-sub{font-size:10px;color:var(--gray-400);line-height:1.4;}
.layout-card.active .lc-name{color:var(--teal);}

/* フォーム */
.field-label{display:block;font-size:11px;font-weight:700;color:var(--gray-600);margin-bottom:6px;letter-spacing:.05em;}
input[type="date"]{width:100%;padding:10px 12px;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:14px;font-family:var(--font);outline:none;margin-bottom:12px;}
input[type="date"]:focus{border-color:var(--teal);}
.btn{padding:11px 20px;border:none;border-radius:var(--radius);font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all .15s;}
.btn-teal{background:var(--teal);color:#fff;}
.btn-teal:hover{background:var(--teal-dark);}
.btn-teal:disabled{background:var(--gray-200);color:var(--gray-400);cursor:not-allowed;}
.btn-block{width:100%;}

/* 残り枚数 */
.seat-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;}
.seat-dot{width:36px;height:36px;border-radius:6px;border:2px solid var(--gray-200);background:var(--white);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gray-400);}
.seat-dot.uploaded{border-color:#27ae60;background:#f0fff4;color:#27ae60;}
.seat-dot.next{border-color:var(--teal);background:var(--teal-light);color:var(--teal);}
.seat-label{font-size:12px;color:var(--gray-600);}

/* ドロップゾーン */
.drop-zone{border:2px dashed var(--gray-200);border-radius:var(--radius);padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:12px;position:relative;}
.drop-zone:hover,.drop-zone.dragover{border-color:var(--teal);background:var(--teal-light);}
.drop-zone.has-file{border-color:var(--teal);background:var(--teal-light);}
.drop-zone input[type="file"]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
.dz-icon{font-size:32px;margin-bottom:8px;}
.dz-text{font-size:13px;color:var(--gray-600);}
.dz-sub{font-size:11px;color:var(--gray-400);margin-top:4px;}
.drop-zone.has-file .dz-text{color:var(--teal);font-weight:700;}

/* ログ */
.log{margin-top:10px;}
.log-item{font-size:12px;padding:8px 12px;border-radius:6px;margin-bottom:6px;display:flex;gap:6px;}
.log-item.ok{background:#f0fff4;color:#27ae60;border:1px solid #b7ebc9;}
.log-item.err{background:#fff0f0;color:#c0392b;border:1px solid #f5a0a0;}

/* URL/プロンプト */
.section-label{font-size:11px;font-weight:700;color:var(--gray-600);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;}
.url-list{font-family:monospace;font-size:12px;line-height:1.8;color:var(--gray-800);background:var(--gray-100);padding:12px;border-radius:var(--radius);margin-bottom:10px;min-height:36px;white-space:pre-wrap;word-break:break-all;}
.prompt-box{font-family:monospace;font-size:12px;line-height:1.7;color:var(--gray-800);background:#fffbe6;border:1px solid #f0d060;padding:12px;border-radius:var(--radius);white-space:pre-wrap;word-break:break-all;min-height:60px;}
.copy-row{display:flex;gap:8px;margin-bottom:14px;}
.btn-sm{padding:7px 14px;font-size:12px;}
.btn-outline{background:var(--white);border:1px solid var(--gray-200);color:var(--gray-800);}
.btn-outline:hover{border-color:var(--teal);color:var(--teal);}
.no-image-box{background:#f0fff4;border:1px solid #b7ebc9;border-radius:var(--radius);padding:16px;}
.no-image-box p{font-size:13px;color:#27ae60;font-weight:700;margin-bottom:4px;}
.no-image-box small{font-size:12px;color:var(--gray-600);}
</style>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>

<div class="topbar">
  <div class="logo">Tohoku Nedzi <b>東北ネヂ製造株式会社</b></div>
  <div class="topbar-title">記事画像アップローダー</div>
  <?php if ($authed): ?>
  <form method="post" style="margin-left:auto;">
    <input type="hidden" name="action" value="logout">
    <button class="logout-btn" type="submit">ログアウト</button>
  </form>
  <?php endif; ?>
</div>

<?php if (!$authed): ?>
<div class="login-wrap">
  <div class="login-box">
    <h2>🔐 ログイン</h2>
    <p>このツールは社内専用です。パスワードを入力してください。</p>
    <?php if (!empty($login_error)): ?>
    <div class="error-msg"><?= htmlspecialchars($login_error) ?></div>
    <?php endif; ?>
    <form method="post">
      <input type="hidden" name="action" value="login">
      <div class="form-group">
        <label>パスワード</label>
        <input type="password" name="password" autofocus required>
      </div>
      <button class="btn-primary" type="submit">ログイン</button>
    </form>
  </div>
</div>

<?php else: ?>
<div class="main">

  <!-- STEP 1: レイアウト選択 -->
  <div class="step">
    <div class="step-header">
      <div class="step-num">1</div>
      <div class="step-title">今回の記事に画像は使いますか？</div>
    </div>
    <div class="layout-scroll">
      <div class="layout-row" id="layout-row">

        <!-- 画像なし -->
        <div class="layout-card" data-type="image0">
          <div class="lc-thumb" style="justify-content:center;gap:5px;min-height:140px;">
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
            <div class="lc-textline"></div>
          </div>
          <div class="lc-caption">
            <div class="lc-name">画像なし</div>
            <div class="lc-sub">テキストのみの記事</div>
          </div>
        </div>

        <!-- 画像1点 -->
        <div class="layout-card active" data-type="image1">
          <div class="lc-thumb">
            <div class="lc-img-area" style="grid-template-columns:1fr;">
              <div class="lc-img" style="height:72px;">🖼</div>
            </div>
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
          </div>
          <div class="lc-caption">
            <div class="lc-name">画像1点</div>
            <div class="lc-sub">横長1枚<br>1200×630px</div>
          </div>
        </div>

        <!-- 画像2点 -->
        <div class="layout-card" data-type="image2">
          <div class="lc-thumb">
            <div class="lc-img-area" style="grid-template-columns:1fr 1fr;">
              <div class="lc-img" style="height:52px;">🖼</div>
              <div class="lc-img" style="height:52px;">🖼</div>
            </div>
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
          </div>
          <div class="lc-caption">
            <div class="lc-name">画像2点</div>
            <div class="lc-sub">2カラム<br>600×400px ×2</div>
          </div>
        </div>

        <!-- 画像3点 -->
        <div class="layout-card" data-type="image3">
          <div class="lc-thumb">
            <div class="lc-img-area" style="grid-template-columns:1fr 1fr 1fr;">
              <div class="lc-img" style="height:40px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:40px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:40px;font-size:10px;">🖼</div>
            </div>
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
          </div>
          <div class="lc-caption">
            <div class="lc-name">画像3点</div>
            <div class="lc-sub">3カラム<br>400×300px ×3</div>
          </div>
        </div>

        <!-- 画像4点 -->
        <div class="layout-card" data-type="image4">
          <div class="lc-thumb">
            <div class="lc-img-area" style="grid-template-columns:1fr 1fr;">
              <div class="lc-img" style="height:36px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:36px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:36px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:36px;font-size:10px;">🖼</div>
            </div>
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
          </div>
          <div class="lc-caption">
            <div class="lc-name">画像4点</div>
            <div class="lc-sub">2×2グリッド<br>600×400px ×4</div>
          </div>
        </div>

        <!-- 画像6点 -->
        <div class="layout-card" data-type="image6">
          <div class="lc-thumb">
            <div class="lc-img-area" style="grid-template-columns:1fr 1fr 1fr;">
              <div class="lc-img" style="height:28px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:28px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:28px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:28px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:28px;font-size:10px;">🖼</div>
              <div class="lc-img" style="height:28px;font-size:10px;">🖼</div>
            </div>
            <div class="lc-textline"></div>
            <div class="lc-textline short"></div>
          </div>
          <div class="lc-caption">
            <div class="lc-name">画像6点</div>
            <div class="lc-sub">2×3ギャラリー<br>400×300px ×6</div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- STEP 2: 日付・フォルダ -->
  <div class="step">
    <div class="step-header">
      <div class="step-num">2</div>
      <div class="step-title">記事の投稿予定日を入力してください</div>
    </div>
    <label class="field-label">投稿予定日</label>
    <input type="date" id="article-date" value="<?= date('Y-m-d') ?>">
    <button class="btn btn-teal btn-block" id="btn-mkdir">フォルダを作成する</button>
    <div class="log" id="mkdir-log"></div>
  </div>

  <!-- STEP 3: 画像アップロード -->
  <div class="step" id="step-upload">
    <div class="step-header">
      <div class="step-num">3</div>
      <div class="step-title">画像をアップロードしてください</div>
    </div>
    <div class="seat-row" id="seat-row"></div>
    <div class="drop-zone" id="drop-zone">
      <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp">
      <div class="dz-icon">🖼</div>
      <div class="dz-text">クリックまたはドラッグ＆ドロップ</div>
      <div class="dz-sub">jpg / png / webp　最大5MB　自動リサイズされます</div>
    </div>
    <button class="btn btn-teal btn-block" id="btn-upload" disabled>アップロードする</button>
    <div class="log" id="upload-log"></div>
  </div>

  <!-- STEP 4: AIプロンプト -->
  <div class="step">
    <div class="step-header">
      <div class="step-num">4</div>
      <div class="step-title">AIプロンプトをコピーしてAIデモへ</div>
    </div>
    <div id="no-image-area" style="display:none;">
      <div class="no-image-box">
        <p>✓ 画像なしの記事です</p>
        <small>AIデモを開いて、テンプレートを選んで記事内容を入力してください。</small>
      </div>
    </div>
    <div id="with-image-area">
      <div class="section-label">生成されたURL一覧</div>
      <div class="url-list" id="url-list">—</div>
      <div class="copy-row">
        <button class="btn btn-outline btn-sm" id="copy-urls">📋 URLをコピー</button>
        <button class="btn btn-outline btn-sm" id="copy-prompt">📋 AIプロンプトをコピー</button>
      </div>
      <div class="section-label">AIデモ用プロンプト</div>
      <div class="prompt-box" id="prompt-box">—</div>
    </div>
  </div>

</div>
<?php endif; ?>

<script>
const BLOCK_DEFS = {
  image0:{count:0,w:0,h:0},
  image1:{count:1,w:1200,h:630},
  image2:{count:2,w:600,h:400},
  image3:{count:3,w:400,h:300},
  image4:{count:4,w:600,h:400},
  image6:{count:6,w:400,h:300},
};
const LAYOUT_DESC = {
  image0:null,image1:'横幅いっぱいの1枚画像として',
  image2:'横に2枚並べて',image3:'横に3枚並べて',
  image4:'2行2列のグリッドで4枚',image6:'2行3列のギャラリーで6枚',
};

let selectedBlock='image1', currentDate=document.getElementById('article-date')?.value||'', selectedFile=null;
const uploadedUrls={};

document.getElementById('layout-row')?.querySelectorAll('.layout-card').forEach(card=>{
  card.addEventListener('click',()=>{
    document.querySelectorAll('.layout-card').forEach(c=>c.classList.remove('active'));
    card.classList.add('active');
    selectedBlock=card.dataset.type;
    updateUI();
  });
});

function updateUI(){
  const def=BLOCK_DEFS[selectedBlock];
  const stepUpload=document.getElementById('step-upload');
  const noImg=document.getElementById('no-image-area');
  const withImg=document.getElementById('with-image-area');
  if(def.count===0){
    stepUpload.style.display='none';
    noImg.style.display='block';
    withImg.style.display='none';
  } else {
    stepUpload.style.display='block';
    noImg.style.display='none';
    withImg.style.display='block';
    buildSeats();
  }
  updatePrompt();
}

function buildSeats(){
  const def=BLOCK_DEFS[selectedBlock];
  const row=document.getElementById('seat-row');
  if(!row)return;
  row.innerHTML='';
  let nextSet=false;
  for(let i=1;i<=def.count;i++){
    const dot=document.createElement('div');
    const up=!!uploadedUrls[i];
    const isNext=!up&&!nextSet;
    if(isNext)nextSet=true;
    dot.className='seat-dot'+(up?' uploaded':(isNext?' next':''));
    dot.textContent=String(i).padStart(2,'0');
    row.appendChild(dot);
  }
  const uploaded=Object.keys(uploadedUrls).filter(k=>parseInt(k)<=def.count).length;
  const remain=def.count-uploaded;
  const lbl=document.createElement('span');
  lbl.className='seat-label';
  lbl.textContent=remain>0?`残り${remain}枚`:'すべてアップロード完了';
  row.appendChild(lbl);
  document.getElementById('btn-upload').disabled=!selectedFile||remain<=0;
}

document.getElementById('article-date')?.addEventListener('change',function(){currentDate=this.value;});

document.getElementById('btn-mkdir')?.addEventListener('click',async()=>{
  currentDate=document.getElementById('article-date').value;
  if(!currentDate){alert('日付を選択してください。');return;}
  const fd=new FormData();fd.append('action','mkdir');fd.append('date',currentDate);
  const res=await fetch(location.href,{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'},body:fd});
  const data=await res.json();
  addLog('mkdir-log',data.ok,data.msg);
});

const dropZone=document.getElementById('drop-zone');
const fileInput=document.getElementById('file-input');
const btnUpload=document.getElementById('btn-upload');

function setFile(file){
  selectedFile=file;
  dropZone?.classList.add('has-file');
  if(dropZone){
    dropZone.querySelector('.dz-text').textContent=file.name;
    dropZone.querySelector('.dz-sub').textContent=(file.size/1024).toFixed(0)+' KB（自動リサイズされます）';
  }
  buildSeats();
}
fileInput?.addEventListener('change',()=>{if(fileInput.files[0])setFile(fileInput.files[0]);});
dropZone?.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('dragover');});
dropZone?.addEventListener('dragleave',()=>dropZone?.classList.remove('dragover'));
dropZone?.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('dragover');if(e.dataTransfer.files[0])setFile(e.dataTransfer.files[0]);});

btnUpload?.addEventListener('click',async()=>{
  if(!selectedFile){alert('画像を選択してください。');return;}
  if(!currentDate){alert('日付を選択してください。');return;}
  const def=BLOCK_DEFS[selectedBlock];
  let nextSeq=1;
  while(uploadedUrls[nextSeq]&&nextSeq<=def.count)nextSeq++;
  if(nextSeq>def.count){alert('このブロックはすでに満席です。');return;}
  btnUpload.disabled=true;btnUpload.textContent='アップロード中...';
  const fd=new FormData();
  fd.append('action','upload');fd.append('date',currentDate);
  fd.append('seq',nextSeq);fd.append('block_type',selectedBlock);fd.append('image',selectedFile);
  const res=await fetch(location.href,{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'},body:fd});
  const data=await res.json();
  addLog('upload-log',data.ok,data.msg);
  if(data.ok){
    uploadedUrls[data.seq]=data.url;
    buildSeats();
    selectedFile=null;
    if(fileInput)fileInput.value='';
    dropZone?.classList.remove('has-file');
    if(dropZone){
      dropZone.querySelector('.dz-text').textContent='クリックまたはドラッグ＆ドロップ';
      dropZone.querySelector('.dz-sub').textContent='jpg / png / webp　最大5MB　自動リサイズされます';
    }
    updatePrompt();
  }
  btnUpload.disabled=false;btnUpload.textContent='アップロードする';
});

function updatePrompt(){
  const def=BLOCK_DEFS[selectedBlock];
  const seqs=Object.keys(uploadedUrls).map(Number).filter(n=>n<=def.count).sort((a,b)=>a-b);
  const urlList=document.getElementById('url-list');
  const promptBox=document.getElementById('prompt-box');
  if(!urlList||!promptBox)return;
  if(seqs.length===0||def.count===0){urlList.textContent='—';promptBox.textContent='—';return;}
  urlList.textContent=seqs.map(s=>`${String(s).padStart(2,'0')}枚目: ${uploadedUrls[s]}`).join('\n');
  const desc=LAYOUT_DESC[selectedBlock];
  const promptLines=seqs.map(s=>`${s}枚目:\n${uploadedUrls[s]}`).join('\n\n');
  promptBox.textContent=`本文中に画像を${seqs.length}点、${desc}配置してください。\n画像URLは以下の通りです。それぞれ適切なalt属性を入れてください。\nHTMLはmicroCMSに貼り付けられる形式で出力してください。\n\n${promptLines}`;
}

function copyText(text,btn){
  const orig=btn.textContent;
  try{
    if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>{btn.textContent='✓ コピーしました';setTimeout(()=>btn.textContent=orig,2000);});}
    else{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);btn.textContent='✓ コピーしました';setTimeout(()=>btn.textContent=orig,2000);}
  }catch(e){alert('手動でコピーしてください。');}
}
document.getElementById('copy-urls')?.addEventListener('click',function(){copyText(document.getElementById('url-list').textContent,this);});
document.getElementById('copy-prompt')?.addEventListener('click',function(){copyText(document.getElementById('prompt-box').textContent,this);});

function addLog(id,ok,msg){
  const log=document.getElementById(id);if(!log)return;
  const div=document.createElement('div');div.className='log-item '+(ok?'ok':'err');
  div.textContent=(ok?'✓ ':'✗ ')+msg;log.prepend(div);
}

updateUI();
</script>
</body>
</html>
