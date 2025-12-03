// 장기 편집기 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const board = document.getElementById('janggi-board');
    const fenTextarea = document.getElementById('fen-text');
    const clearBoardBtn = document.getElementById('clear-board');
    const initialPositionBtn = document.getElementById('initial-position');
    const removePieceBtn = document.getElementById('remove-piece');
    const copyFenBtn = document.getElementById('copy-fen');

    
    let isRemoving = false;
    let selectedPiece = null; // 현재 선택된 기물
    let boardState = Array(10).fill().map(() => Array(9).fill(''));
    
    // 장기판 초기화
    function initializeBoard() {
        board.innerHTML = '';
        
        // 장기판의 각 셀 생성
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'janggi-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // 셀 클릭 이벤트 설정
                cell.addEventListener('click', handleCellClick);
                
                board.appendChild(cell);
            }
        }
    }
    
    // 기물 렌더링
    function renderPieces() {
        // 기존 기물 모두 제거
        document.querySelectorAll('.janggi-piece').forEach(piece => piece.remove());
        
        // 현재 상태에 따라 기물 렌더링
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = boardState[row][col];
                if (piece) {
                    const cell = board.querySelector(`.janggi-cell[data-row="${row}"][data-col="${col}"]`);
                    createPieceElement(piece, cell);
                }
            }
        }
    }
    
    // 기물 요소 생성 함수
    function createPieceElement(piece, cell) {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'janggi-piece';
        pieceElement.dataset.piece = piece;
        
        const img = document.createElement('img');
        
        // 기물 코드에 따라 이미지 설정
        switch (piece) {
            // 한(Han) 기물
            case 'K': img.src = 'images/han_gung.png'; img.alt = '한 궁'; break;
            case 'R': img.src = 'images/han_cha.png'; img.alt = '한 차'; break;
            case 'B': img.src = 'images/han_sang.png'; img.alt = '한 상'; break;
            case 'N': img.src = 'images/han_ma.png'; img.alt = '한 마'; break;
            case 'A': img.src = 'images/han_sa.png'; img.alt = '한 사'; break;
            case 'C': img.src = 'images/han_fo.png'; img.alt = '한 포'; break;
            case 'P': img.src = 'images/han_b.png'; img.alt = '한 병'; break;
            
            // 초(Cho) 기물
            case 'k': img.src = 'images/cho_gung.png'; img.alt = '초 궁'; break;
            case 'r': img.src = 'images/cho_cha.png'; img.alt = '초 차'; break;
            case 'b': img.src = 'images/cho_sang.png'; img.alt = '초 상'; break;
            case 'n': img.src = 'images/cho_ma.png'; img.alt = '초 마'; break;
            case 'a': img.src = 'images/cho_sa.png'; img.alt = '초 사'; break;
            case 'c': img.src = 'images/cho_fo.png'; img.alt = '초 포'; break;
            case 'p': img.src = 'images/cho_jol.png'; img.alt = '초 졸'; break;
        }
        
        pieceElement.appendChild(img);
        
        // 기물 클릭 이벤트 설정
        pieceElement.addEventListener('click', function(e) {
            e.stopPropagation(); // 이벤트 버블링 방지
            
            if (isRemoving) {
                // 제거 모드일 때 기물 클릭 시 제거
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                boardState[row][col] = '';
                this.remove();
                updateFEN();
            } else {
                // 제거 모드가 아닐 때 기물 선택 (이동용)
                if (selectedPiece === piece) {
                    // 이미 선택된 기물 클릭 시 선택 취소
                    deselectAllPieces();
                    selectedPiece = null;
                } else {
                    // 다른 기물 선택
                    deselectAllPieces();
                    this.classList.add('selected');
                    selectedPiece = {
                        type: piece,
                        row: parseInt(cell.dataset.row),
                        col: parseInt(cell.dataset.col)
                    };
                }
            }
        });
        
        cell.appendChild(pieceElement);
    }
    
    // 모든 선택 해제
    function deselectAllPieces() {
        document.querySelectorAll('.janggi-piece.selected').forEach(piece => {
            piece.classList.remove('selected');
        });
        
        document.querySelectorAll('.janggi-cell.highlight').forEach(cell => {
            cell.classList.remove('highlight');
        });
    }
    
    // 셀 클릭 핸들러
    function handleCellClick(e) {
        const cell = e.target.closest('.janggi-cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (selectedPiece && !isRemoving) {
            // 이미 선택된 기물이 있고 제거 모드가 아닌 경우 (기물 이동)
            if (selectedPiece.row === row && selectedPiece.col === col) {
                // 같은 셀 클릭 시 선택 취소
                deselectAllPieces();
                selectedPiece = null;
            } else {
                // 다른 셀로 이동
                boardState[selectedPiece.row][selectedPiece.col] = '';
                boardState[row][col] = selectedPiece.type;
                
                deselectAllPieces();
                selectedPiece = null;
                renderPieces();
                updateFEN();
            }
        } else if (selectedPiece && isRemoving) {
            // 선택된 기물이 있고 제거 모드인 경우 (기존 로직과 동일)
            const pieceElement = cell.querySelector('.janggi-piece');
            if (pieceElement) {
                boardState[row][col] = '';
                pieceElement.remove();
                updateFEN();
            }
        }
    }
    
    // FEN 문자열 업데이트
    function updateFEN() {
    let fen = '';
    let turn = 'w'; // 기본값: 한궁이 아래에 있는 경우
    let reverseBoard = false; // 보드 반전 여부

    // 한궁(K)과 초궁(k)의 위치 파악
    let hanKingRow = -1, choKingRow = -1;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = boardState[row][col];
            if (piece === 'K') hanKingRow = row;
            if (piece === 'k') choKingRow = row;
        }
    }


    // 초궁과 한궁의 위치를 비교하여 차례와 보드 반전 여부 결정
    if (choKingRow > hanKingRow) {
        turn = 'b'; // 초궁이 아래에 있으므로 차례는 b
        reverseBoard = true; // FEN 문자열 반전 활성화
    } else {
        turn = 'w'; // 한궁이 아래에 있으므로 차례는 w
        reverseBoard = false; // FEN 문자열 반전 비활성화
    }

    // 보드 데이터를 읽어서 FEN 문자열 생성
    const rows = [];
    for (let row = 0; row < 10; row++) {
        let emptyCount = 0;
        let rowFen = '';

        for (let col = 0; col < 9; col++) {
            const piece = boardState[row][col];
            if (piece === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowFen += emptyCount;
                    emptyCount = 0;
                }
                rowFen += piece;
            }
        }

        if (emptyCount > 0) {
            rowFen += emptyCount;
        }

        rows.push(rowFen);
    }
 

    // FEN 문자열 반전 처리
    if (reverseBoard) {
        rows.reverse(); // 행 순서를 뒤집음
        rows.forEach((row, index) => {
            let reversedRow = '';
            let emptyCount = 0;

            // 각 행의 기물을 좌우 반전
            for (let i = row.length - 1; i >= 0; i--) {
                const char = row[i];

                if (!isNaN(char)) {
                    // 숫자(빈칸) 처리
                    emptyCount += parseInt(char, 10);
                } else {
                    // 기물이 나오면 이전 빈칸을 추가하고 초기화
                    if (emptyCount > 0) {
                        reversedRow += emptyCount;
                        emptyCount = 0;
                    }
                   
                    reversedRow += char 
                }
            }

            // 마지막 빈칸 처리
            if (emptyCount > 0) {
                reversedRow += emptyCount;
            }

            rows[index] = reversedRow;
        });
    }


    // FEN 문자열 생성
    fen = rows.join('/');
    fen += ` ${turn} - - 0 1`; // 기본값으로 추가된 부분

    // FEN 텍스트 영역에 업데이트
    fenTextarea.value = fen;
}
    // FEN 문자열로부터 보드 상태 로드
    function loadFromFEN(fen) {
        // 보드 초기화
        boardState = Array(10).fill().map(() => Array(9).fill(''));
        
        const rows = fen.split('/');
        if (rows.length !== 10) {
            alert('잘못된 FEN 형식입니다.');
            return false;
        }
        
        for (let row = 0; row < 10; row++) {
            const rowData = rows[row];
            let col = 0;
            
            for (let i = 0; i < rowData.length; i++) {
                const char = rowData.charAt(i);
                
                if (!isNaN(char)) {
                    // 숫자인 경우 빈 칸 개수
                    col += parseInt(char);
                } else {
                    // 기물 문자인 경우
                    if (col < 9) {
                        boardState[row][col] = char;
                        col++;
                    }
                }
            }
        }
        
        renderPieces();
        return true;
    }
    
    // 초기 위치 설정
    function setInitialPosition() {
        const initialFEN = 'rnba1anbr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNBA1ANBR';
        loadFromFEN(initialFEN);
        updateFEN();
    }
    
    // 기물 팔레트 클릭 이벤트 설정
    document.querySelectorAll('.palette-piece').forEach(piece => {
        piece.addEventListener('click', function() {
            if (isRemoving) {
                // 제거 모드 중에는 기물 선택 비활성화
                return;
            }
            
            // 이전에 선택된 팔레트 기물 선택 해제
            document.querySelectorAll('.palette-piece.active').forEach(p => {
                p.classList.remove('active');
            });
            
            // 현재 선택된 보드 기물 선택 해제
            deselectAllPieces();
            
            // 현재 팔레트 기물 선택
            this.classList.add('active');
            selectedPiece = {
                type: this.dataset.piece,
                fromPalette: true
            };
        });
    });
    
    // 보드 셀 클릭 이벤트 추가 (팔레트에서 선택된 기물 배치)
    board.addEventListener('click', function(e) {
        const cell = e.target.closest('.janggi-cell');
        if (!cell || !selectedPiece || isRemoving) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (selectedPiece.fromPalette) {
            // 팔레트에서 선택된 기물 배치
            boardState[row][col] = selectedPiece.type;
            
            // 기물 선택 상태 초기화
            document.querySelectorAll('.palette-piece.active').forEach(p => {
                p.classList.remove('active');
            });
            
            selectedPiece = null;
            renderPieces();
            updateFEN();
        }
    });
    
    // 버튼 이벤트 설정
    clearBoardBtn.addEventListener('click', function() {
        boardState = Array(10).fill().map(() => Array(9).fill(''));
        renderPieces();
        updateFEN();
        deselectAllPieces();
        selectedPiece = null;
    });
    
    initialPositionBtn.addEventListener('click', function() {
        setInitialPosition();
        deselectAllPieces();
        selectedPiece = null;
    });
    
    removePieceBtn.addEventListener('click', function() {
        isRemoving = !isRemoving;
        board.classList.toggle('is-removing', isRemoving);
        this.textContent = isRemoving ? '제거 모드 끄기' : '기물 제거';
        
        if (isRemoving) {
            deselectAllPieces();
            selectedPiece = null;
            document.querySelectorAll('.palette-piece.active').forEach(p => {
                p.classList.remove('active');
            });
        }
    });
    
    copyFenBtn.addEventListener('click', function() {
        fenTextarea.select();
        document.execCommand('copy');
        alert('FEN이 클립보드에 복사되었습니다.');
    });
    
    
    // 초기화
    initializeBoard();
    setInitialPosition();
});
