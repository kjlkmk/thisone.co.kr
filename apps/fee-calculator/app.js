document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculate-btn');
    const amountInput = document.getElementById('final-amount');

    calculateBtn.addEventListener('click', calculateFare);
    
    amountInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            calculateFare();
        }
    });

    function calculateFare() {
        const finalAmount = parseFloat(amountInput.value);
        const resultsDiv = document.getElementById('results');

        if (isNaN(finalAmount) || finalAmount <= 0) {
            resultsDiv.innerHTML = '<p style="color: red; text-align: center;">유효한 금액을 입력해주세요.</p>';
            return;
        }

        const commissionRates = [23, 15, 20, 25, 30];
        let resultsHTML = '<table>';
        resultsHTML += '<tr><th>수수료율</th><th>원래 운임</th><th>수수료 금액</th></tr>';

        commissionRates.forEach(rate => {
            const originalFare = finalAmount / (1 - rate / 100);
            const commissionAmount = originalFare - finalAmount;

            const isDefault = rate === 23 ? 'class="highlight"' : '';
            
            resultsHTML += `
                <tr ${isDefault}>
                    <td>${rate}%</td>
                    <td>${Math.round(originalFare).toLocaleString()}원</td>
                    <td>${Math.round(commissionAmount).toLocaleString()}원</td>
                </tr>
            `;
        });

        resultsHTML += '</table>';
        resultsDiv.innerHTML = resultsHTML;
    }
});
