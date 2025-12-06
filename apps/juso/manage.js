
const DB_NAME = 'AddressDB';
const DB_VERSION = 3;
const CITY_STORE_NAME = 'cities';
const DONG_STORE_NAME = 'dongs';

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            console.log('manage.js: onupgradeneeded triggered');
            db = event.target.result;
            if (!db.objectStoreNames.contains(CITY_STORE_NAME)) {
                db.createObjectStore(CITY_STORE_NAME, { keyPath: 'id' });
                console.log('manage.js: City store created');
            }
            if (!db.objectStoreNames.contains(DONG_STORE_NAME)) {
                const dongStore = db.createObjectStore(DONG_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                dongStore.createIndex('city_id', 'city_id', { unique: false });
                dongStore.createIndex('dong_name', 'dong_name', { unique: false });
                console.log('manage.js: Dong store created');
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve(db);
            loadCitiesForAddDong();
            loadDongsByCity();
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

async function loadCitiesForAddDong() {
    const selectElement = document.getElementById('add-dong-city-select');
    selectElement.innerHTML = '<option value="">도시 선택</option>';

    const transaction = db.transaction([CITY_STORE_NAME], 'readonly');
    const store = transaction.objectStore(CITY_STORE_NAME);
    const cities = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.city.localeCompare(b.city)));
        request.onerror = () => reject(request.error);
    });

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.city;
        selectElement.appendChild(option);
    });
}

async function loadDongsByCity() {
    const accordionDiv = document.getElementById('accordion');
    accordionDiv.innerHTML = '';

    const transaction = db.transaction([CITY_STORE_NAME, DONG_STORE_NAME], 'readonly');
    const cityStore = transaction.objectStore(CITY_STORE_NAME);
    const dongStore = transaction.objectStore(DONG_STORE_NAME);

    const cities = await new Promise((resolve, reject) => {
        const request = cityStore.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.city.localeCompare(b.city)));
        request.onerror = () => reject(request.error);
    });

    for (const city of cities) {
        const dongs = await new Promise((resolve, reject) => {
            const request = dongStore.index('city_id').getAll(city.id);
            request.onsuccess = () => resolve(request.result.sort((a, b) => a.dong_name.localeCompare(b.dong_name)));
            request.onerror = () => reject(request.error);
        });

        const cityHash = city.id; // Use city.id directly as it's unique

        let dongsHtml = '';
        if (dongs.length === 0) {
            dongsHtml = '<li class="list-group-item">등록된 동이 없습니다.</li>';
        } else {
            dongs.forEach(dong => {
                dongsHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span id="dong-name-${dong.id}">${dong.dong_name}</span>
                        <form id="edit-form-${dong.id}" class="form-inline d-none" onsubmit="event.preventDefault(); updateDong(${dong.id});">
                            <input type="text" name="new_dong_name" class="form-control form-control-sm mr-2" value="${dong.dong_name}" required>
                            <button type="submit" class="btn btn-sm btn-success">저장</button>
                            <button type="button" class="btn btn-sm btn-secondary ml-1" onclick="toggleEdit(${dong.id})">취소</button>
                        </form>
                        <div>
                            <button id="edit-btn-${dong.id}" class="btn btn-sm btn-warning" onclick="toggleEdit(${dong.id})">수정</button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="deleteDong(${dong.id})">삭제</button>
                        </div>
                    </li>
                `;
            });
        }

        const cardHtml = `
            <div class="card">
                <div class="card-header" id="heading-${cityHash}">
                    <h5 class="mb-0">
                        <button class="btn btn-link" data-toggle="collapse" data-target="#collapse-${cityHash}" aria-expanded="false">
                            ${city.city}
                        </button>
                    </h5>
                </div>
                <div id="collapse-${cityHash}" class="collapse" data-parent="#accordion">
                    <div class="card-body">
                        <ul class="list-group">
                            ${dongsHtml}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        accordionDiv.innerHTML += cardHtml;
    }
}

document.addEventListener('DOMContentLoaded', openDatabase);

document.getElementById('add-dong-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const cityId = parseInt(document.getElementById('add-dong-city-select').value);
    const dongName = document.getElementById('add-dong-name-input').value.trim();

    if (!cityId || !dongName) {
        alert('도시와 동 이름을 모두 입력해주세요.');
        return;
    }

    const transaction = db.transaction([DONG_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DONG_STORE_NAME);
    
    // Find the maximum ID and increment it for the new dong
    const allDongs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    const maxId = allDongs.reduce((max, dong) => Math.max(max, dong.id), 0);
    const newId = maxId + 1;

    const newDong = { id: newId, city_id: cityId, dong_name: dongName };

    const request = store.add(newDong);
    request.onsuccess = () => {
        alert('동이 추가되었습니다.');
        document.getElementById('add-dong-form').reset();
        loadDongsByCity(); // Reload the list
    };
    request.onerror = (e) => {
        console.error('Error adding dong:', e.target.error);
        alert('동 추가에 실패했습니다.');
    };
});

function toggleEdit(dongId) {
    document.getElementById(`dong-name-${dongId}`).classList.toggle('d-none');
    document.getElementById(`edit-form-${dongId}`).classList.toggle('d-none');
    document.getElementById(`edit-btn-${dongId}`).parentElement.classList.toggle('d-none');
}

async function updateDong(dongId) {
    const newDongName = document.querySelector(`#edit-form-${dongId} input[name="new_dong_name"]`).value.trim();

    if (!newDongName) {
        alert('새 동 이름을 입력해주세요.');
        return;
    }

    const transaction = db.transaction([DONG_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DONG_STORE_NAME);
    const dong = await new Promise((resolve, reject) => {
        const request = store.get(dongId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    if (dong) {
        dong.dong_name = newDongName;
        const request = store.put(dong);
        request.onsuccess = () => {
            alert('동 이름이 수정되었습니다.');
            loadDongsByCity(); // Reload the list
        };
        request.onerror = (e) => {
            console.error('Error updating dong:', e.target.error);
            alert('동 이름 수정에 실패했습니다.');
        };
    }
}

async function deleteDong(dongId) {
    if (!confirm('정말 삭제하시겠습니까?')) {
        return;
    }

    const transaction = db.transaction([DONG_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DONG_STORE_NAME);
    const request = store.delete(dongId);

    request.onsuccess = () => {
        alert('동이 삭제되었습니다.');
        loadDongsByCity(); // Reload the list
    };
    request.onerror = (e) => {
        console.error('Error deleting dong:', e.target.error);
        alert('동 삭제에 실패했습니다.');
    };
}
