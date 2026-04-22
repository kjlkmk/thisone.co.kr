
const DB_NAME = 'AddressDB';
const DB_VERSION = 3;
const CITY_STORE_NAME = 'cities';
const DONG_STORE_NAME = 'dongs';
const PRESET_STORE_NAME = 'presets'; // Will be used later for presets.html

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            console.log(`Upgrading database from version ${event.oldVersion} to ${DB_VERSION}`);
            const db = event.target.result;
            const transaction = event.target.transaction;

            // oldVersion을 기준으로 순차적으로 업그레이드를 실행합니다.
            // 예를 들어 사용자가 1버전이면 2, 3버전 업그레이드가 순서대로 실행됩니다.
            
            if (event.oldVersion < 1) {
                // 맨 처음 생성될 때
                console.log('Creating initial stores for version 1');
                db.createObjectStore(CITY_STORE_NAME, { keyPath: 'id' });
                const dongStore = db.createObjectStore(DONG_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                dongStore.createIndex('city_id', 'city_id', { unique: false });
            }

            if (event.oldVersion < 2) {
                // 버전 2로 업그레이드: dong_name 인덱스 추가
                console.log('Upgrading to version 2: Adding dong_name index');
                const dongStore = transaction.objectStore(DONG_STORE_NAME);
                if (!dongStore.indexNames.contains('dong_name')) {
                    dongStore.createIndex('dong_name', 'dong_name', { unique: false });
                }
            }

            if (event.oldVersion < 3) {
                // 버전 3로 업그레이드: presets 스토어 추가
                console.log('Upgrading to version 3: Adding presets store');
                if (!db.objectStoreNames.contains(PRESET_STORE_NAME)) {
                    db.createObjectStore(PRESET_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve(db);
            checkAndImportData();
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

async function checkAndImportData() {
    const cityCount = await getObjectStoreCount(CITY_STORE_NAME);
    const dongCount = await getObjectStoreCount(DONG_STORE_NAME);

    if (cityCount === 0 || dongCount === 0) {
        console.log('Importing data from CSV files...');
        await importCsvData();
    } else {
        console.log('Data already exists in IndexedDB.');
        loadCitiesIntoCheckboxes();
    }
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

async function importCsvData() {
    try {
        const cityCsv = await fetch('city_info.csv').then(response => response.text());
        const dongCsv = await fetch('dong_info.csv').then(response => response.text());

        const cities = parseCsv(cityCsv).map(row => ({ id: parseInt(row.id), city: row.city }));
        const dongs = parseCsv(dongCsv).map(row => ({ id: parseInt(row.id), city_id: parseInt(row.city_id), dong_name: row.dong_name }));

        await addDataToStore(CITY_STORE_NAME, cities);
        await addDataToStore(DONG_STORE_NAME, dongs);

        console.log('CSV data imported successfully.');
        loadCitiesIntoCheckboxes();
    } catch (error) {
        console.error('Error importing CSV data:', error);
    }
}

function parseCsv(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i].trim().replace(/^"|"$/g, ''); // Remove quotes
        });
        return obj;
    });
}

function addDataToStore(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        data.forEach(item => store.add(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

async function loadCitiesIntoCheckboxes() {
    const cityCheckboxesDiv = document.getElementById('city-checkboxes');
    cityCheckboxesDiv.innerHTML = ''; // Clear existing checkboxes

    const transaction = db.transaction([CITY_STORE_NAME], 'readonly');
    const store = transaction.objectStore(CITY_STORE_NAME);
    const cities = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.city.localeCompare(b.city)));
        request.onerror = () => reject(request.error);
    });

    cities.forEach(city => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" name="cities[]" value="${city.id}" id="city_${city.id}">
            <label class="form-check-label" for="city_${city.id}">${city.city}</label>
        `;
        cityCheckboxesDiv.appendChild(div);
    });
}

// Global utility functions (can be moved to a separate utils.js if preferred)
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

function resetPage() {
    document.getElementById('dong_input_textarea').value = '';
    document.getElementById('analysis-results').style.display = 'none';
    document.getElementById('city-selection-form').reset(); // Reset city selection form
    document.getElementById('city-dong-list-output').style.display = 'none'; // Hide city dong list output
    document.getElementById('city-dong-list-text').innerText = ''; // Clear city dong list text
    document.getElementById('city-dong-count').innerText = '0'; // Reset city dong count
}

// Event Listeners
document.addEventListener('DOMContentLoaded', openDatabase);
document.getElementById('reset-btn').addEventListener('click', resetPage);

document.getElementById('get-dongs-btn').addEventListener('click', async () => {
    const selectedCityIds = Array.from(document.querySelectorAll('#city-checkboxes input[type="checkbox"]:checked'))
                                .map(checkbox => parseInt(checkbox.value));
    const truncateToTwoChars = document.getElementById('truncate_to_two_chars').checked;
    const dongInputTextarea = document.getElementById('dong_input_textarea');
    const cityDongListOutput = document.getElementById('city-dong-list-output');
    const cityDongListText = document.getElementById('city-dong-list-text');
    const cityDongCountSpan = document.getElementById('city-dong-count');

    if (selectedCityIds.length === 0) {
        alert('도시를 선택해주세요.');
        return;
    }

    const transaction = db.transaction([DONG_STORE_NAME], 'readonly');
    const store = transaction.objectStore(DONG_STORE_NAME);
    const cityIdIndex = store.index('city_id');

    let dongs = [];
    for (const cityId of selectedCityIds) {
        const request = cityIdIndex.getAll(cityId);
        const cityDongs = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        dongs = dongs.concat(cityDongs.map(d => d.dong_name));
    }

    let uniqueDongs = [...new Set(dongs)].sort();
    let displayDongs = uniqueDongs;

    if (truncateToTwoChars) {
        displayDongs = uniqueDongs.map(dong => dong.substring(0, 2));
    }

    cityDongListText.innerText = displayDongs.join(',');
    dongInputTextarea.value = displayDongs.join(','); // Auto-fill analyzer textarea
    cityDongCountSpan.innerText = uniqueDongs.length;
    cityDongListOutput.style.display = 'block';
});

document.getElementById('analyze-dongs-btn').addEventListener('click', async () => {
    const dongInputVal = document.getElementById('dong_input_textarea').value;
    const dongsToAnalyze = dongInputVal.split(',').map(d => d.trim()).filter(d => d.length > 0);

    const analysisResultsDiv = document.getElementById('analysis-results');
    const uniqueDongsOutput = document.getElementById('unique-dongs-output');
    const duplicateDongsOutput = document.getElementById('duplicate-dongs-output');
    const invalidDongsOutput = document.getElementById('invalid-dongs-output');
    const combinedExcludeDongsOutput = document.getElementById('combined-exclude-dongs-output');

    uniqueDongsOutput.innerHTML = '';
    duplicateDongsOutput.innerHTML = '';
    invalidDongsOutput.innerHTML = '';
    combinedExcludeDongsOutput.innerHTML = '';

    if (dongsToAnalyze.length === 0) {
        alert('분석할 동 이름을 입력해주세요.');
        analysisResultsDiv.style.display = 'none';
        return;
    }

    const uniqueDongs = [];
    const duplicateDongs = [];
    const invalidDongs = [];
    const allExcludeDongs = new Set();

    const allDongsInDb = await getAllDongsFromDb();
    const allCitiesInDb = await getAllCitiesFromDb();
    const cityIdToNameMap = new Map(allCitiesInDb.map(city => [city.id, city.city]));

    for (const dong of dongsToAnalyze) {
        console.log(`Analyzing dong: ${dong}`);

        // Filter all dongs to find those that contain the input dong as a substring
        const foundLocations = allDongsInDb.filter(loc => loc.dong_name.includes(dong));
        console.log(`Found locations (substring match) for ${dong}:`, foundLocations);

        // The foundLocations already contains all substring matches.
        // We will use foundLocations directly for analysis.

        if (foundLocations.length === 0) {
            invalidDongs.push(dong);
        } else {
            const cityDongMap = {};
            const allMatchedDongsForThisInput = new Set();

            for (const match of foundLocations) { // Use foundLocations here
                const city = cityIdToNameMap.get(match.city_id);
                if (city) {
                    if (!cityDongMap[city]) {
                        cityDongMap[city] = [];
                    }
                    cityDongMap[city].push(match.dong_name);
                    allMatchedDongsForThisInput.add(match.dong_name);
                }
            }
            console.log(`allMatchedDongsForThisInput for ${dong}:`, allMatchedDongsForThisInput);

            const cityCount = Object.keys(cityDongMap).length;

            if (cityCount === 1) {
                uniqueDongs.push(dong);
            } else {
                const formattedCities = [];
                for (const cityName in cityDongMap) {
                    const dongsInCity = cityDongMap[cityName].sort();
                    formattedCities.push(`${cityName} (${dongsInCity.join(', ')})`);
                }
                formattedCities.sort();

                const excludeDongsForThisItem = [...allMatchedDongsForThisInput].filter(d => d !== dong).sort();
                console.log(`excludeDongsForThisItem for ${dong}:`, excludeDongsForThisItem);
                excludeDongsForThisItem.forEach(d => allExcludeDongs.add(d));
                console.log(`allExcludeDongs after processing ${dong}:`, allExcludeDongs);

                duplicateDongs.push({
                    name: dong,
                    cities: formattedCities.join(', '),
                    exclude_dongs_for_copy: excludeDongsForThisItem.join(',')
                });
            }
        }
    }

    uniqueDongs.sort();
    invalidDongs.sort();
    duplicateDongs.sort((a, b) => a.name.localeCompare(b.name));

    // Display Unique Dongs
    if (uniqueDongs.length > 0) {
        const uniqueList = uniqueDongs.join(',');
        uniqueDongsOutput.innerHTML = `
            <p><strong>총 ${uniqueDongs.length}개</strong></p>
            <button type="button" class="btn btn-success btn-sm mb-2" onclick="copyToClipboard('${uniqueList}')">📋 전체 복사</button>
            <div class="p-2 bg-white rounded border">${uniqueList}</div>
        `;
    } else {
        uniqueDongsOutput.innerHTML = '<p class="text-muted">고유한 동이 없습니다.</p>';
    }

    // Display Duplicate Dongs
    if (duplicateDongs.length > 0) {
        let duplicateHtml = `<p><strong>총 ${duplicateDongs.length}개</strong></p><ul class="list-group">`;
        duplicateDongs.forEach(item => {
            duplicateHtml += `
                <li class="list-group-item">
                    <strong class="text-danger">${item.name}:</strong> <span class="text-danger">${item.cities}</span>
                `;
            if (item.exclude_dongs_for_copy) {
                duplicateHtml += `
                    <button type="button" class="btn btn-sm btn-outline-danger ml-2" onclick="copyToClipboard('${item.exclude_dongs_for_copy}')">🚫 제외지 복사</button>
                `;
            }
            duplicateHtml += `
                </li>
            `;
        });
        duplicateHtml += `</ul>`;
        duplicateDongsOutput.innerHTML = duplicateHtml;
    } else {
        duplicateDongsOutput.innerHTML = '<p class="text-muted">중복된 동이 없습니다.</p>';
    }

    // Display Invalid Dongs
    if (invalidDongs.length > 0) {
        const invalidList = invalidDongs.join(', ');
        invalidDongsOutput.innerHTML = `
            <p><strong>총 ${invalidDongs.length}개</strong></p>
            <button type="button" class="btn btn-warning btn-sm mb-2" onclick="copyToClipboard('${invalidList}')">📋 복사</button>
            <div class="p-2 bg-white rounded border">${invalidList}</div>
        `;
    } else {
        invalidDongsOutput.innerHTML = '<p class="text-muted">존재하지 않는 동이 없습니다.</p>';
    }

    // New logic to filter exclude-dongs
    const selectedCityIds = Array.from(document.querySelectorAll('#city-checkboxes input[type="checkbox"]:checked'))
                                .map(checkbox => parseInt(checkbox.value));

    let dongsFromSelectedCities = new Set();
    if (selectedCityIds.length > 0) {
        const transaction = db.transaction([DONG_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DONG_STORE_NAME);
        const cityIdIndex = store.index('city_id');

        let dongPromises = [];
        for (const cityId of selectedCityIds) {
            const request = cityIdIndex.getAll(cityId);
            const dongPromise = new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result.map(d => d.dong_name));
                request.onerror = () => reject(request.error);
            });
            dongPromises.push(dongPromise);
        }
        
        const allDongsArrays = await Promise.all(dongPromises);
        allDongsArrays.forEach(dongArray => {
            dongArray.forEach(dong => dongsFromSelectedCities.add(dong));
        });
    }

    const finalExcludeDongs = [...allExcludeDongs].filter(dong => !dongsFromSelectedCities.has(dong));
    
    // Display Combined Exclude Dongs (now using the filtered list)
    const combinedExcludeList = finalExcludeDongs.sort().join(',');
    if (combinedExcludeList) {
        combinedExcludeDongsOutput.innerHTML = `
            <p><strong>총 ${finalExcludeDongs.length}개</strong></p>
            <button type="button" class="btn btn-info btn-sm mb-2" onclick="copyToClipboard('${combinedExcludeList}')">📋 전체 제외지 복사</button>
            <div class="p-2 bg-white rounded border">${combinedExcludeList}</div>
        `;
    } else {
        combinedExcludeDongsOutput.innerHTML = '<p class="text-muted">생성할 제외지가 없습니다.</p>';
    }

    analysisResultsDiv.style.display = 'block';

    // --- Start Reverse Lookup Logic (Integrated) ---
    const reverseLookupResult = {}; // { input_dong_name: [(city_name, matched_dong_name_from_db), ...] }

    for (const inputDongName of dongsToAnalyze) {
        const foundLocations = allDongsInDb.filter(dbDong => dbDong.dong_name.includes(inputDongName));
        
        const cityDongTuplesForInputDong = [];
        for (const match of foundLocations) {
            const cityName = cityIdToNameMap.get(match.city_id);
            if (cityName) {
                cityDongTuplesForInputDong.push([cityName, match.dong_name]);
            }
        }
        reverseLookupResult[inputDongName] = cityDongTuplesForInputDong;
    }

    // 2. Calculate city frequency for context
    const cityFrequency = {};
    for (const dongName in reverseLookupResult) {
        for (const [city, matchedDong] of reverseLookupResult[dongName]) {
            cityFrequency[city] = (cityFrequency[city] || 0) + 1;
        }
    }

    // 3. Infer best city for each ambiguous dong
    const ambiguousDongInferences = {};
    for (const dongName in reverseLookupResult) {
        const citiesList = reverseLookupResult[dongName];
        if (citiesList.length > 1) {
            let bestCityForDong = null;
            let maxFreq = -1;
            for (const [city, matchedDong] of citiesList) {
                const freq = cityFrequency[city] || 0;
                if (freq > maxFreq) {
                    maxFreq = freq;
                    bestCityForDong = { city: city, matchedDong: matchedDong };
                }
            }
            if (bestCityForDong) {
                ambiguousDongInferences[dongName] = `${bestCityForDong.city} (${bestCityForDong.matchedDong})`;
            }
        }
    }

    // 4. Create the definitive list of selected cities based on inference
    const definitiveCities = new Set();
    for (const dongName in reverseLookupResult) {
        const citiesList = reverseLookupResult[dongName];
        if (citiesList.length === 1) { // Unambiguous dongs
            definitiveCities.add(citiesList[0][0]);
        } else if (ambiguousDongInferences[dongName]) { // Ambiguous dongs with an inference
            const inferredCityStr = ambiguousDongInferences[dongName];
            const inferredCityFullName = inferredCityStr.split(' (')[0];
            definitiveCities.add(inferredCityFullName);
        }
    }

    // 5. Create the initial list of eliminated cities
    const eliminatedCitiesInitial = new Set();
    for (const dongName in reverseLookupResult) {
        const citiesList = reverseLookupResult[dongName];
        if (citiesList.length > 1 && ambiguousDongInferences[dongName]) {
            const winnerCityName = ambiguousDongInferences[dongName].split(' (')[0];
            for (const [city, matchedDong] of citiesList) {
                if (city !== winnerCityName) {
                    eliminatedCitiesInitial.add(city);
                }
            }
        }
    }

    // 6. Ensure mutual exclusivity (THE FIX)
    const finalEliminatedCities = new Set([...eliminatedCitiesInitial].filter(city => !definitiveCities.has(city)));

    // 7. Generate final simplified lists
    const finalSimplifiedCitiesSet = new Set([...definitiveCities].map(city => simplifyCityName(city)));
    const simplifiedEliminatedCitiesSet = new Set([...finalEliminatedCities].map(city => simplifyCityName(city)));

    // Display Reverse Lookup results
    document.getElementById('final-simplified-cities-output').innerText = [...finalSimplifiedCitiesSet].sort().join(',');
    document.getElementById('final-eliminated-cities-output').innerText = [...simplifiedEliminatedCitiesSet].sort().join(',');
    
    // --- New: Combined Final Exclusion Logic ---
    const truncatedEliminatedCities = [...simplifiedEliminatedCitiesSet].map(city => city.substring(0, 2));
    const combinedFinalExclusionList = [...new Set([...truncatedEliminatedCities, ...finalExcludeDongs.sort()])];
    
    document.getElementById('final-combined-exclusion-output').innerText = combinedFinalExclusionList.join(',');
    
    // --- New: Combined Final Dong List Logic (Dongs + Final Cities) ---
    const truncatedFinalCities = [...finalSimplifiedCitiesSet].map(city => city.substring(0, 2));
    const combinedFinalDongList = [...new Set([...dongsToAnalyze, ...truncatedFinalCities])].sort();
    
    document.getElementById('final-combined-dongs-output').innerText = combinedFinalDongList.join(',');

    // --- New: Regex Generation Logic ---
    const exclusionRegex = generateCompressedRegex(combinedFinalExclusionList);
    const dongsRegex = generateCompressedRegex(combinedFinalDongList);

    document.getElementById('final-exclusion-regex-output').innerText = exclusionRegex;
    document.getElementById('final-dongs-regex-output').innerText = dongsRegex;

    // --- New: Master Generator Logic ---
    const masterInputDisplay = document.getElementById('master-generator-input-display');
    const masterKeywordCount = document.getElementById('master-keyword-count');
    const masterCharCount = document.getElementById('master-char-count');
    
    const dongListStr = combinedFinalDongList.join(',');
    masterInputDisplay.innerText = dongListStr;
    masterKeywordCount.innerText = combinedFinalDongList.length;
    masterCharCount.innerText = dongListStr.length;
    
    // Reset output when new analysis starts
    document.getElementById('master-regex-output-container').style.display = 'none';
    document.getElementById('master-regex-output').innerText = '';
    // --- End Reverse Lookup Logic (Integrated) ---
});

// Event Listener for Master Regex Generation
document.getElementById('generate-master-regex-btn').addEventListener('click', () => {
    const outputContainer = document.getElementById('master-regex-output-container');
    const outputDiv = document.getElementById('master-regex-output');
    
    const dongListStr = document.getElementById('master-generator-input-display').innerText;
    if (!dongListStr || dongListStr.trim() === "") {
        alert("분석된 동 목록이 없습니다.");
        return;
    }
    
    const dongList = dongListStr.split(',');
    // Generate negative lookahead master regex: ^(?![^$]*(동1|동2|...))[^$]*
    const regexPattern = `^(?![^$]*(${dongList.join('|')}))[^$]*`;
    
    outputDiv.innerText = regexPattern;
    outputContainer.style.display = 'block';
});

// Helper function to generate compressed regex pattern like prefix[chars]|...
function generateCompressedRegex(list) {
    if (!list || list.length === 0) return "";
    
    const items = [...new Set(list)].sort();
    const groups = {};
    
    items.forEach(item => {
        if (item.length === 0) return;
        const first = item.charAt(0);
        const rest = item.substring(1);
        if (!groups[first]) groups[first] = [];
        groups[first].push(rest);
    });
    
    const parts = [];
    for (const first of Object.keys(groups).sort()) {
        const suffixes = groups[first];
        if (suffixes.length === 1) {
            parts.push(first + suffixes[0]);
        } else {
            const allSingle = suffixes.every(s => s.length === 1);
            if (allSingle) {
                parts.push(`${first}[${suffixes.join('')}]`);
            } else {
                const hasEmpty = suffixes.includes("");
                const nonEmpty = suffixes.filter(s => s !== "");
                if (hasEmpty) {
                    parts.push(`${first}(${nonEmpty.join('|')})?`);
                } else {
                    parts.push(`${first}(${nonEmpty.join('|')})`);
                }
            }
        }
    }
    
    return parts.join('|');
}

// Helper function for simplifying city names (client-side equivalent of Flask's simplify_city_name)
function simplifyCityName(fullCityName) {
    const PROVINCES = [
        "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
        "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    ];
    const parts = fullCityName.split(' ');
    let province = null;
    if (parts.length > 0 && PROVINCES.includes(parts[0])) {
        province = parts[0];
        parts.shift(); // Remove province for further processing
    }

    let simplifiedName = "";

    if (province === "서울" || province === "인천") {
        for (const part of parts) {
            if (part.endsWith('구')) {
                simplifiedName = part;
                break;
            }
        }
    } else if (province === "경기") {
        for (const part of parts) {
            if (part.endsWith('시') || part.endsWith('군')) {
                simplifiedName = part;
                break;
            }
        }
    }
    
    return simplifiedName || fullCityName; // Return original if no specific part found
}

// Function to get all dongs from IndexedDB
async function getAllDongsFromDb() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DONG_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DONG_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Function to get all cities from IndexedDB
async function getAllCitiesFromDb() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CITY_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CITY_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


