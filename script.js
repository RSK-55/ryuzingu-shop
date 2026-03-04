// 龍神宮 - JavaScript

// デフォルト商品データ
const defaultProducts = [
    {
        id: 1,
        name: "龍の涙",
        tagline: "古のDragonの力を宿す逸品",
        description: "西藏天然石と水晶をベースに、龍の鱗を象ったチャームを配置。持ち主を見守る力があるとされる神秘的な一品です。",
        size: "約17cm〜19cm（調整可能）",
        price: "¥12,800",
        images: []
    },
    {
        id: 2,
        name: "翠嵐",
        tagline: "森の精霊が紡ぐ癒しの波動",
        description: "翡翠と瑠璃のグラデーションが美しい一品。森林浴を受けたような清涼感を届けると言われています。",
        size: "約16cm〜18cm（調整可能）",
        price: "¥15,800",
        images: []
    },
    {
        id: 3,
        name: "海神の祝福",
        tagline: "大海原の力を手に",
        description: "ターコイズとラピスラズリで海洋を表現。航海安全や心の平静を願う方に最適な一品です。",
        size: "約17cm〜20cm（調整可能）",
        price: "¥18,800",
        images: []
    }
];

// デフォルト設定
const defaultSettings = {
    lineUrl: "https://line.me/ja/",
    instagramFortune: "",
    instagramBracelet: "",
    spreadsheetUrl: "",
    lastSyncTime: ""
};

// 管理者認証情報
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "RYUSUKE123"
};

// 商品データの初期化
function initializeProducts() {
    const stored = localStorage.getItem("ryujingu_products");
    if (!stored) {
        localStorage.setItem("ryujingu_products", JSON.stringify(defaultProducts));
    }
    
    const settings = localStorage.getItem("ryujingu_settings");
    if (!settings) {
        localStorage.setItem("ryujingu_settings", JSON.stringify(defaultSettings));
    }
}

// 設定の取得
function getSettings() {
    const stored = localStorage.getItem("ryujingu_settings");
    return stored ? JSON.parse(stored) : defaultSettings;
}

// 設定の保存
function saveSettings(settings) {
    localStorage.setItem("ryujingu_settings", JSON.stringify(settings));
}

// LINE URLの取得
function getLineUrl() {
    const settings = getSettings();
    return settings.lineUrl || defaultSettings.lineUrl;
}

//  商品データの取得
function getProducts() {
    const stored = localStorage.getItem("ryujingu_products");
    return stored ? JSON.parse(stored) : defaultProducts;
}

// スプレッドシートから商品データを取得
async function fetchFromSpreadsheet() {
    const settings = getSettings();
    let spreadsheetUrl = settings.spreadsheetUrl;
    
    if (!spreadsheetUrl) {
        return { error: "URLが設定されていません" };
    }
    
    try {
        spreadsheetUrl = spreadsheetUrl.trim();
        
        // Google Apps Script URLかチェック
        if (spreadsheetUrl.includes('script.google.com')) {
            // GASのままfetch
        } else {
            spreadsheetUrl = convertToCsvUrl(spreadsheetUrl);
        }
        
        console.log('Fetching from:', spreadsheetUrl);
        
        const response = await fetch(spreadsheetUrl, {
            method: 'GET',
            mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            return { error: `HTTPエラー: ${response.status}` };
        }
        
        const csvText = await response.text();
        console.log('Response length:', csvText.length);
        
        if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
            return { error: "HTMLが返ってきました。Google Apps Scriptを使用する場合、スプレッドシートIDをGASに渡してください。" };
        }
        
        if (!csvText || csvText.trim().length === 0) {
            return { error: "空の応答が返ってきました" };
        }
        
        const products = parseCsvToProducts(csvText, true);
        
        if (products && products.length > 0) {
            settings.lastSyncTime = new Date().toLocaleString('ja-JP');
            saveSettings(settings);
            saveProducts(products);
            localStorage.setItem("ryujingu_use_spreadsheet", "true");
            return products;
        }
        
        return { error: "商品を解析できませんでした。" };
        
    } catch (error) {
        console.error('Fetch error:', error);
        return { error: `通信エラー: ${error.message}` };
    }
}

// Google Apps Scriptを作成・取得するUI
function showGasSetup() {
    const settings = getSettings();
    const spreadsheetId = extractSpreadsheetId(settings.spreadsheetUrl);
    if (!spreadsheetId) {
        alert('まずスプレッドシートURLを保存してください');
        return;
    }
    
    const gasUrl = `https://script.google.com/macros/s/AKfycbzXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec`;
    
    const message = `Google Apps Scriptを使ってCORSエラーを回避できます：

【手順】
1. sheets.google.com で新しいスプレッドシートを開く
2. 拡張機能 > Apps Script を選択
3. 以下のコードを貼り付け
4. 「デプロイ」>「新しいデプロイ」
5. 「ウェブアプリ」を選択
6. を実行者を「本人」、アクセス者を「全員」に設定
7. 「デプロイ」をクリック
8. 出てきたURLを管理画面に入力

--- 貼り付けるコード ---
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const csv = data.map(row => row.join(',')).join('\\n');
  
  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CVS)
    .setHeader('Access-Control-Allow-Origin', '*');
}`;
    
    alert(message);
}

// Google Sheets URLをCSVエクスポートURLに変換
function convertToCsvUrl(spreadsheetUrl) {
    spreadsheetUrl = spreadsheetUrl.trim();
    
    if (spreadsheetUrl.includes('output=csv')) {
        return spreadsheetUrl;
    }
    
    if (spreadsheetUrl.includes('output=html')) {
        return spreadsheetUrl.replace('output=html', 'output=csv');
    }
    
    if (spreadsheetUrl.includes('/pubhtml')) {
        return spreadsheetUrl.replace('/pubhtml', '/pub?output=csv');
    }
    
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (spreadsheetId) {
        const gidMatch = spreadsheetUrl.match(/gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        return `https://docs.google.com/spreadsheets/d/e/2PACX-1v${spreadsheetId}/pub?gid=${gid}&single=true&output=csv`;
    }
    
    return spreadsheetUrl;
}

// スプレッドシートIDを抽出
function extractSpreadsheetId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

// デバッグ用：最後に同期した生のCSVデータを保存
let lastDebugInfo = {
    rawCsv: '',
    parsedProducts: [],
    errors: []
};

// CSVデータを商品オブジェクトに変換
function parseCsvToProducts(csvText, saveDebug = true) {
    const lines = csvText.trim().split(/\r?\n/);
    
    if (lines.length < 2) {
        console.log('Not enough lines in CSV:', lines.length);
        if (saveDebug) {
            lastDebugInfo.errors.push('CSVの行数が少なすぎます: ' + lines.length + '行');
        }
        return [];
    }
    
    // ヘッダー行を検出（ID, 商品名, etc.）
    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes('id') || headerLine.includes('商品名') || headerLine.includes('name');
    
    if (saveDebug) {
        lastDebugInfo.rawCsv = csvText;
        lastDebugInfo.errors.push('ヘッダー検出: ' + (hasHeader ? 'あり' : 'なし'));
        lastDebugInfo.errors.push('総行数: ' + lines.length + '行');
    }
    
    const startIndex = hasHeader ? 1 : 0;
    const products = [];
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCsvLine(line);
        
        if (saveDebug) {
            lastDebugInfo.errors.push(`行${i+1}: ${values.length}列 - 画像URL列(7列目): "${values[6] || ''}"`);
        }
        
        if (values.length < 2) continue;
        
        // ID, 商品名, キャッチコピー, 紹介文, サイズ, 金額, 画像URL
        const imageUrls = values[6] ? values[6].split(/[|,\n]/).map(url => url.trim()).filter(url => url) : [];
        const validImages = imageUrls.map(url => {
            // バックスラッシュをフォワードスラッシュに変換
            url = url.replace(/\\/g, '/');
            // ファイル名のみの場合（http://, https://, images/, ./, / いずれも始まるない場合）
            // images/ フォルダにあると仮定してプレフィックスを追加
            if (!url.startsWith('http') && !url.startsWith('images/') && !url.startsWith('./') && !url.startsWith('/')) {
                url = 'images/' + url;
            }
            return url;
        }).filter(url => {
            // http/https画像パス、images/、./、またはファイル名のみ（拡張子あり）
            return url.startsWith('http') || 
                   url.startsWith('images/') || 
                   url.startsWith('./') ||
                   url.startsWith('/') ||
                   /\.[a-zA-Z0-9]+$/.test(url); // 拡張子を持つファイル名
        });
        
        const product = {
            id: parseInt(values[0]) || (i + 1),
            name: values[1] || "",
            tagline: values[2] || "",
            description: values[3] || "",
            size: values[4] || "",
            price: values[5] || "",
            images: validImages
        };
        
        if (saveDebug) {
            lastDebugInfo.errors.push(`商品「${product.name}」: 画像${validImages.length}枚 - ${JSON.stringify(validImages)}`);
        }
        
        if (product.name) {
            products.push(product);
        }
    }
    
    if (saveDebug) {
        lastDebugInfo.parsedProducts = products;
        lastDebugInfo.errors.push('解析完了: ' + products.length + '件');
    }
    
    console.log('Parsed products:', products);
    return products;
}

// デバッグ情報を表示
function showDebugInfo() {
    const debugWindow = window.open('', '_blank', 'width=600,height=500');
    if (!debugWindow) {
        alert('ポップアップがブロックされました。ブロックを解除してください。');
        return;
    }
    
    let html = '<html><head><meta charset="UTF-8"><title>デバッグ情報</title></head><body style="font-family:monospace;padding:20px;">';
    html += '<h2>同期デバッグ情報</h2>';
    html += '<h3>エラー/ログ:</h3><pre style="background:#f5f5f5;padding:10px;max-height:200px;overflow:auto;">';
    html += lastDebugInfo.errors.join('\n') || 'エラーなし';
    html += '</pre>';
    html += '<h3>解析された商品:</h3><pre style="background:#f5f5f5;padding:10px;max-height:200px;overflow:auto;">';
    html += JSON.stringify(lastDebugInfo.parsedProducts, null, 2);
    html += '</pre>';
    html += '<h3>生CSV（最初の2000文字）:</h3><pre style="background:#f5f5f5;padding:10px;max-height:200px;overflow:auto;">';
    html += lastDebugInfo.rawCsv.substring(0, 2000);
    html += '</pre>';
    html += '<p><a href="#" onclick="window.close();return false;">閉じる</a></p>';
    html += '</body></html>';
    
    debugWindow.document.write(html);
    debugWindow.document.close();
}

// CSVの1行を正しくパース（カンマ внутри quotes 対応）
function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
}

// 商品の自動同期
async function syncFromSpreadsheet() {
    const settings = getSettings();
    if (!settings.spreadsheetUrl) {
        return { success: false, message: "スプレッドシートURLが設定されていません" };
    }
    
    const result = await fetchFromSpreadsheet();
    
    if (result && result.error) {
        return { success: false, message: result.error };
    }
    
    if (result && Array.isArray(result) && result.length > 0) {
        return { 
            success: true, 
            message: `${result.length}件の商品を同期しました`,
            lastSync: settings.lastSyncTime
        };
    } else {
        return { success: false, message: "商品データが見つかりません" };
    }
}

// スプレッドシートモードかチェック
function isUsingSpreadsheet() {
    return localStorage.getItem("ryujingu_use_spreadsheet") === "true";
}

// スプレッドシートモードを解除（手動管理に戻す）
function disableSpreadsheetMode() {
    localStorage.setItem("ryujingu_use_spreadsheet", "false");
}

// 商品データの保存
function saveProducts(products) {
    localStorage.setItem("ryujingu_products", JSON.stringify(products));
    localStorage.setItem("ryujingu_use_spreadsheet", "false");
}

// 画像カルーセルのHTML生成
function renderCarousel(images, productId) {
    if (!images || images.length === 0) {
        return '<div class="no-image">商品を準備中</div>';
    }
    
    const activeClass = 'active';
    let dots = '';
    let imgs = '';
    
    images.forEach((img, index) => {
        dots += `<span class="${index === 0 ? activeClass : ''}" onclick="event.stopPropagation(); switchImage(${productId}, ${index})"></span>`;
        imgs += `<img src="${img}" class="${index === 0 ? activeClass : ''}" data-index="${index}" alt="商品画像">`;
    });
    
    return `
        <div class="carousel" id="carousel-${productId}">
            ${imgs}
            ${images.length > 1 ? `<div class="carousel-nav">${dots}</div>` : ''}
        </div>
    `;
}

// カルーセル画像切り替え
function switchImage(productId, index) {
    const carousel = document.getElementById(`carousel-${productId}`);
    if (!carousel) return;
    
    const images = carousel.querySelectorAll('img');
    const dots = carousel.querySelectorAll('.carousel-nav span');
    
    images.forEach((img, i) => {
        img.classList.toggle('active', i === index);
    });
    
    if (dots) {
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }
}

// カルーセル自動回転
function startCarousel(productId, images) {
    if (images.length <= 1) return;
    
    let currentIndex = 0;
    setInterval(() => {
        currentIndex = (currentIndex + 1) % images.length;
        switchImage(productId, currentIndex);
    }, 3000);
}

// 現在のフィルター状態
let currentFilter = {
    tag: '',
    sort: ''
};

// 説明文からハッシュタグを抽出
function extractTags(description) {
    if (!description) return [];
    const matches = description.match(/[#{].*?[^\s　]/g);
    if (!matches) return [];
    return matches.map(tag => tag.replace(/^[#{}\s　]+/, '').trim());
}

// 商品がフィルター条件に一致するか
function matchesFilter(product, filter) {
    const tags = extractTags(product.description);
    
    // タグフィルター（五行または運）
    if (filter.tag) {
        const matched = tags.some(tag => tag.includes(filter.tag));
        if (!matched) return false;
    }
    
    return true;
}

// フィルターとソートを適用
function applyFilters() {
    const filter = document.getElementById('sortSelect')?.value || '';
    currentFilter.sort = filter;
    renderMainPage();
}

// タグでフィルター
function filterByTag(tag) {
    currentFilter.tag = tag;
    
    // ボタンのアクティブ状態更新
    document.querySelectorAll('.filter-tag, .gogyou-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === tag || (tag === '' && btn.textContent === 'すべて')) {
            btn.classList.add('active');
        }
    });
    
    renderMainPage();
}

// 金額を比較用的数値に変換
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const num = priceStr.replace(/[¥,\s　]/g, '');
    return parseInt(num) || 0;
}

// メインページの表示
function renderMainPage() {
    let products = getProducts();
    const grid = document.getElementById("productGrid");
    const lineUrl = getLineUrl();
    const settings = getSettings();
    
    if (!grid) return;
    
    // フィルター適用
    if (currentFilter.tag) {
        products = products.filter(p => matchesFilter(p, currentFilter));
    }
    
    // ソート適用
    if (currentFilter.sort === 'price-asc') {
        products.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (currentFilter.sort === 'price-desc') {
        products.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    
    // LINEボタンURL更新
    const lineBtn = document.getElementById("lineButton");
    if (lineBtn) {
        lineBtn.href = lineUrl;
    }
    
    // Instagram URL更新
    const instagramFortune = document.getElementById("instagramFortune");
    const instagramBracelet = document.getElementById("instagramBracelet");
    const instagramSection = document.getElementById("instagramSection");
    
    if (instagramSection) {
        if (settings.instagramFortune) {
            instagramFortune.href = settings.instagramFortune;
            instagramFortune.style.display = "inline-flex";
        } else {
            instagramFortune.style.display = "none";
        }
        
        if (settings.instagramBracelet) {
            instagramBracelet.href = settings.instagramBracelet;
            instagramBracelet.style.display = "inline-flex";
        } else {
            instagramBracelet.style.display = "none";
        }
        
        if (!settings.instagramFortune && !settings.instagramBracelet) {
            instagramSection.style.display = "none";
        } else {
            instagramSection.style.display = "flex";
        }
    }
    
    // 商品がない場合
    if (products.length === 0) {
        grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1;padding:2rem;">該当する商品がありません</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const images = product.images || [];
        return `
            <div class="product-card" onclick="openModal(${product.id})">
                <div class="product-image">
                    ${renderCarousel(images, product.id)}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-tagline">${product.tagline}</p>
                    <p class="product-description">${product.description}</p>
                    <div class="product-details">
                        <span class="product-size">${product.size}</span>
                        <span class="product-price">${product.price}</span>
                    </div>
                    <a href="${lineUrl}" target="_blank" class="product-buy-btn" onclick="event.stopPropagation();">
                        LINE購入☞公式ライン
                    </a>
                </div>
            </div>
        `;
    }).join("");
    
    // カルーセル開始
    products.forEach(product => {
        const images = product.images || [];
        if (images.length > 1) {
            setTimeout(() => startCarousel(product.id, images), 100);
        }
    });
}

// モーダル関連
let currentProductId = null;
let modalCarouselInterval = null;

function openModal(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentProductId = productId;
    const lineUrl = getLineUrl();
    
    document.getElementById("modalName").textContent = product.name;
    document.getElementById("modalTagline").textContent = product.tagline;
    document.getElementById("modalDescription").textContent = product.description;
    document.getElementById("modalSize").textContent = product.size;
    document.getElementById("modalPrice").textContent = product.price;
    document.getElementById("modalLineBtn").href = lineUrl;
    
    const images = product.images || [];
    const modalImage = document.getElementById("modalImage");
    
    if (images.length === 0) {
        modalImage.innerHTML = '<div class="no-image">商品を準備中</div>';
    } else {
        let dots = '';
        let imgs = '';
        images.forEach((img, index) => {
            dots += `<span class="${index === 0 ? 'active' : ''}" onclick="switchModalImage(${index})"></span>`;
            imgs += `<img src="${img}" class="${index === 0 ? 'active' : ''}" data-index="${index}" alt="商品画像">`;
        });
        
        modalImage.innerHTML = `
            <div class="carousel" id="modal-carousel">
                ${imgs}
                ${images.length > 1 ? `<div class="carousel-nav">${dots}</div>` : ''}
            </div>
        `;
        
        if (images.length > 1) {
            let currentIndex = 0;
            modalCarouselInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % images.length;
                switchModalImage(currentIndex);
            }, 3000);
        }
    }
    
    document.getElementById("productModal").style.display = "block";
}

function switchModalImage(index) {
    const carousel = document.getElementById("modal-carousel");
    if (!carousel) return;
    
    const images = carousel.querySelectorAll('img');
    const dots = carousel.querySelectorAll('.carousel-nav span');
    
    images.forEach((img, i) => {
        img.classList.toggle('active', i === index);
    });
    
    if (dots) {
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }
}

function closeModal() {
    document.getElementById("productModal").style.display = "none";
    if (modalCarouselInterval) {
        clearInterval(modalCarouselInterval);
        modalCarouselInterval = null;
    }
    currentProductId = null;
}

// モーダル外クリックで閉じる
window.onclick = function(event) {
    const modal = document.getElementById("productModal");
    if (event.target == modal) {
        closeModal();
    }
}

// 管理者ログインページ
function showLoginPage() {
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("adminSection").style.display = "none";
}

function showAdminPage() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("adminSection").style.display = "block";
    renderAdminProducts();
    loadSettings();
}

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("loginError");
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem("ryujingu_admin", "true");
        showAdminPage();
    } else {
        errorEl.textContent = "ユーザー名またはパスワードが正しくありません";
    }
}

function logout() {
    sessionStorage.removeItem("ryujingu_admin");
    showLoginPage();
}

function checkAdminAuth() {
    if (!sessionStorage.getItem("ryujingu_admin")) {
        showLoginPage();
    } else {
        showAdminPage();
    }
}

// 管理画面の商品リスト表示
function renderAdminProducts() {
    const products = getProducts();
    const list = document.getElementById("adminProductList");
    
    list.innerHTML = products.map(product => {
        const images = product.images || [];
        const firstImage = images.length > 0 ? images[0] : '';
        
        return `
            <div class="admin-product-item">
                <div class="product-image" style="width:120px;height:120px;border-radius:10px;">
                    ${firstImage ? `<img src="${firstImage}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '画像なし'}
                </div>
                <div class="admin-product-info">
                    <h4>${product.name}</h4>
                    <p>${product.tagline}</p>
                    <p>${product.price}</p>
                    <p style="font-size:0.8rem;color:#666;">画像数: ${images.length}/5</p>
                </div>
                <div class="admin-product-actions">
                    <button class="btn btn-secondary" onclick="editProduct(${product.id})">編集</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">削除</button>
                </div>
            </div>
        `;
    }).join("");
}

// 商品追加・編集フォームの表示
function showProductForm(product = null) {
    const form = document.getElementById("productFormSection");
    const title = document.getElementById("formTitle");
    
    form.style.display = "block";
    document.getElementById("adminProductListSection").style.display = "none";
    document.getElementById("settingsSection").style.display = "none";
    
    // 画像入力を5つ準備
    const imageInputs = [];
    for (let i = 1; i <= 5; i++) {
        imageInputs.push(`
            <div class="form-group">
                <label for="productImage${i}">画像${i} URL</label>
                <input type="text" id="productImage${i}" placeholder="https://...">
            </div>
        `);
    }
    document.getElementById("imageInputsContainer").innerHTML = imageInputs.join("");
    
    if (product) {
        title.textContent = "商品を編集";
        document.getElementById("productId").value = product.id;
        document.getElementById("productName").value = product.name;
        document.getElementById("productTagline").value = product.tagline;
        document.getElementById("productDescription").value = product.description;
        document.getElementById("productSize").value = product.size;
        document.getElementById("productPrice").value = product.price;
        
        const images = product.images || [];
        for (let i = 1; i <= 5; i++) {
            document.getElementById(`productImage${i}`).value = images[i-1] || '';
        }
    } else {
        title.textContent = "商品を追加";
        document.getElementById("productForm").reset();
        document.getElementById("productId").value = "";
    }
}

function hideProductForm() {
    document.getElementById("productFormSection").style.display = "none";
    document.getElementById("adminProductListSection").style.display = "block";
}

// 商品の保存
function saveProduct() {
    const id = document.getElementById("productId").value;
    const products = getProducts();
    
    // 画像収集（5枚まで空白 제외）
    const images = [];
    for (let i = 1; i <= 5; i++) {
        const imgUrl = document.getElementById(`productImage${i}`).value.trim();
        if (imgUrl) {
            images.push(imgUrl);
        }
    }
    
    const newProduct = {
        id: id ? parseInt(id) : Date.now(),
        name: document.getElementById("productName").value,
        tagline: document.getElementById("productTagline").value,
        description: document.getElementById("productDescription").value,
        size: document.getElementById("productSize").value,
        price: document.getElementById("productPrice").value,
        images: images
    };
    
    if (id) {
        const index = products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            products[index] = newProduct;
        }
    } else {
        products.push(newProduct);
    }
    
    saveProducts(products);
    hideProductForm();
    renderAdminProducts();
    showMessage("商品を保存しました");
}

// 商品の編集
function editProduct(id) {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        showProductForm(product);
    }
}

// 商品の削除
function deleteProduct(id) {
    if (confirm("この商品を削除しますか？")) {
        let products = getProducts();
        products = products.filter(p => p.id !== id);
        saveProducts(products);
        renderAdminProducts();
        showMessage("商品を削除しました");
    }
}

// 設定の読み込み
function loadSettings() {
    const settings = getSettings();
    document.getElementById("lineUrl").value = settings.lineUrl || "";
    document.getElementById("instagramFortune").value = settings.instagramFortune || "";
    document.getElementById("instagramBracelet").value = settings.instagramBracelet || "";
    document.getElementById("spreadsheetUrl").value = settings.spreadsheetUrl || "";
    
    const syncInfo = document.getElementById("syncInfo");
    if (syncInfo) {
        if (settings.lastSyncTime) {
            syncInfo.innerHTML = `<p style="color:#28a745;margin-top:0.5rem;">最終同期: ${settings.lastSyncTime}</p>`;
        } else {
            syncInfo.innerHTML = "";
        }
    }
}

// 設定の保存
function saveSettingsHandler() {
    const settings = {
        lineUrl: document.getElementById("lineUrl").value.trim() || "https://line.me/ja/",
        instagramFortune: document.getElementById("instagramFortune").value.trim(),
        instagramBracelet: document.getElementById("instagramBracelet").value.trim(),
        spreadsheetUrl: document.getElementById("spreadsheetUrl").value.trim(),
        lastSyncTime: getSettings().lastSyncTime
    };
    saveSettings(settings);
    showMessage("設定を保存しました");
}

// 設定セクションの表示
function showSettings() {
    document.getElementById("settingsSection").style.display = "block";
    document.getElementById("adminProductListSection").style.display = "none";
    document.getElementById("productFormSection").style.display = "none";
    loadSettings();
}

function hideSettings() {
    document.getElementById("settingsSection").style.display = "none";
    document.getElementById("adminProductListSection").style.display = "block";
}

function showMessage(msg) {
    const el = document.getElementById("message");
    el.textContent = msg;
    el.className = "success";
    setTimeout(() => {
        el.textContent = "";
        el.className = "";
    }, 3000);
}

// スプレッドシート同期ハンドラー
async function syncFromSpreadsheetHandler() {
    const result = await syncFromSpreadsheet();
    showMessage(result.message);
    
    if (result.success) {
        renderAdminProducts();
        loadSettings();
    }
}

// スプレッドシート連携解除ハンドラー
function disableSpreadsheetHandler() {
    if (confirm("スプレッドシート連携を解除しますか？解除後は手動で商品を管理できます。")) {
        disableSpreadsheetMode();
        showMessage("スプレッドシート連携を解除しました");
    }
}

// 水の泡アニメーション
function createBubbles() {
    const bubbleContainer = document.getElementById('bubbles');
    if (!bubbleContainer) return;
    
    const bubbleCount = 20;
    
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        const size = Math.random() * 30 + 10;
        const left = Math.random() * 100;
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * 10;
        
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = left + '%';
        bubble.style.animationDuration = duration + 's';
        bubble.style.animationDelay = delay + 's';
        
        bubbleContainer.appendChild(bubble);
    }
}

// 表示切替機能
function toggleView() {
    document.body.classList.toggle('pc-view');
    const isPC = document.body.classList.contains('pc-view');
    localStorage.setItem('ryujingu_view', isPC ? 'pc' : 'mobile');
    updateToggleButton();
}

function updateToggleButton() {
    const btn = document.getElementById('viewToggleBtn');
    if (!btn) return;
    
    const isPC = document.body.classList.contains('pc-view');
    btn.querySelector('.toggle-text').textContent = isPC ? 'スマホ表示' : 'PC表示';
}

function initView() {
    const savedView = localStorage.getItem('ryujingu_view');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (savedView === 'pc') {
        document.body.classList.add('pc-view');
    } else if (savedView === 'mobile') {
        document.body.classList.remove('pc-view');
    } else {
        // 初期値: モバイルユーザーはモバイル表示、PCユーザーはPC表示
        if (!isMobile) {
            document.body.classList.add('pc-view');
        }
    }
    updateToggleButton();
}

// 初期化
document.addEventListener("DOMContentLoaded", function() {
    initializeProducts();
    createBubbles();
    initView();
    
    if (document.getElementById("productGrid")) {
        const settings = getSettings();
        if (settings.spreadsheetUrl) {
            fetchFromSpreadsheet().then((result) => {
                // エラー時はローカルデータを使用
                if (!result || result.error) {
                    console.log('Using local products due to sync error');
                }
                renderMainPage();
            });
        } else {
            renderMainPage();
        }
    }
    
    if (document.getElementById("loginSection")) {
        checkAdminAuth();
    }
});
