
const DB_NAME = 'AddressDB';
const DB_VERSION = 3;
const PRESET_STORE_NAME = 'presets';

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            console.log('presets.js: onupgradeneeded triggered');
            db = event.target.result;
            if (!db.objectStoreNames.contains(PRESET_STORE_NAME)) {
                db.createObjectStore(PRESET_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                console.log('presets.js: Preset store created');
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve(db);
            checkAndInitializePresets();
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

async function checkAndInitializePresets() {
    const presetCount = await getObjectStoreCount(PRESET_STORE_NAME);
    if (presetCount === 0) {
        console.log('Initializing presets...');
        await initializePresets();
    }
    loadPresets();
}

function getObjectStoreCount(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function initializePresets() {
    const transaction = db.transaction([PRESET_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PRESET_STORE_NAME);
    for (let i = 1; i <= 10; i++) {
        await new Promise((resolve, reject) => {
            const request = store.add({ id: i, title: `제목${i}`, dongs: '' });
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }
}

async function loadPresets() {
    const presetListDiv = document.getElementById('preset-list');
    presetListDiv.innerHTML = '';

    const transaction = db.transaction([PRESET_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PRESET_STORE_NAME);
    const presets = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.id - b.id));
        request.onerror = () => reject(request.error);
    });

    presets.forEach(preset => {
        const presetItemDiv = document.createElement('div');
        presetItemDiv.className = 'preset-item';
        presetItemDiv.innerHTML = `
            <form data-preset-id="${preset.id}">
                <div class="form-group">
                    <label for="title_${preset.id}"><h5>제목:</h5></label>
                    <input type="text" name="preset_title" id="title_${preset.id}" class="form-control form-control-sm" value="${preset.title}" required>
                </div>
                <div class="form-group">
                    <label for="dongs_${preset.id}">동 목록 (쉼표로 구분):</label>
                    <textarea name="preset_dongs" id="dongs_${preset.id}" class="form-control" rows="3" placeholder="예: 갈현동,신사동,역삼동">${preset.dongs}</textarea>
                </div>
                <div class="d-flex justify-content-end">
                    <button type="button" class="btn btn-success btn-sm mr-2" onclick="copyToClipboard('${preset.dongs}')">📋 복사</button>
                    <button type="submit" class="btn btn-primary btn-sm">💾 저장</button>
                </div>
            </form>
        `;
        presetListDiv.appendChild(presetItemDiv);

        presetItemDiv.querySelector('form').addEventListener('submit', savePreset);
    });
}

async function savePreset(event) {
    event.preventDefault();
    const form = event.target;
    const presetId = parseInt(form.dataset.presetId);
    const title = form.querySelector('input[name="preset_title"]').value.trim();
    const dongs = form.querySelector('textarea[name="preset_dongs"]').value.trim();

    const transaction = db.transaction([PRESET_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PRESET_STORE_NAME);

    const preset = await new Promise((resolve, reject) => {
        const request = store.get(presetId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    if (preset) {
        preset.title = title;
        preset.dongs = dongs;
        const request = store.put(preset);
        request.onsuccess = () => {
            alert('프리셋이 저장되었습니다.');
            loadPresets(); // Reload to reflect changes
        };
        request.onerror = (e) => {
            console.error('Error saving preset:', e.target.error);
            alert('프리셋 저장에 실패했습니다.');
        };
    }
}

// Global utility function (re-defined here for simplicity, but ideally shared)
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function() {
            alert('복사되었습니다!');
        }, function(err) {
            alert('복사 실패: ' + err);
        });
    } else {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('복사되었습니다!');
        } catch (err) {
            alert('복사 실패: ' + err);
        }
        document.body.removeChild(textArea);
    }
}

document.addEventListener('DOMContentLoaded', openDatabase);
