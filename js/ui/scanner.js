
import { analyzeImage } from '../services/ai.js';
import { showNotification } from './notifications.js';
import { openTransactionModal } from './modals.js';

let appCategories = [];

export function openScannerModal(categories) {
    if (categories) appCategories = categories;
    const modal = document.getElementById('scanner-modal');
    if (modal) {
        modal.classList.remove('hidden', 'opacity-0');
        resetScanner();
    }
}

function resetScanner() {
    const preview = document.getElementById('scanner-preview');
    const input = document.getElementById('scanner-input');
    const resultDiv = document.getElementById('scanner-result');

    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    if (input) input.value = '';
    if (resultDiv) resultDiv.classList.add('hidden');

    const btn = document.getElementById('scanner-submit-btn');
    if (btn) btn.disabled = true;
}

export function initScannerListeners() {
    const input = document.getElementById('scanner-input');
    const preview = document.getElementById('scanner-preview');
    const submitBtn = document.getElementById('scanner-submit-btn');

    if (input) {
        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    submitBtn.disabled = false;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', handleScannerSubmit);
    }
}

async function handleScannerSubmit() {
    const input = document.getElementById('scanner-input');
    if (!input || !input.files || input.files.length === 0) return;

    const file = input.files[0];
    const btn = document.getElementById('scanner-submit-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Analisando...';
    btn.disabled = true;

    try {
        const base64 = await readFileAsBase64(file);
        const base64Data = base64.split(',')[1];

        const apiKey = localStorage.getItem('API_KEY');
        if (!apiKey) {
            showNotification('Chave API não configurada. Configure nas Configurações.', 'error');
            return;
        }

        const prompt = `Analise esta imagem de comprovante fiscal. Extraia os dados e retorne APENAS um JSON válido (sem markdown) no seguinte formato:
        {
            "description": "Nome do estabelecimento ou descrição breve",
            "amount": 0.00 (número),
            "date": "YYYY-MM-DD" (se encontrar, senão data de hoje),
            "category": "Sugestão de categoria (Alimentação, Transporte, Lazer, etc)"
        }`;

        const resultText = await analyzeImage(base64Data, prompt, apiKey);

        let jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        showNotification('Nota processada com sucesso!', 'success');

        const transactionData = {
            description: data.description || 'Comprovante Escaneado',
            amount: data.amount || 0,
            date: data.date || new Date().toISOString().slice(0, 10),
            category: data.category || 'Outros'
        };

        document.getElementById('scanner-modal').classList.add('hidden', 'opacity-0');

        openTransactionModal('expense', null, appCategories, transactionData);

    } catch (err) {
        console.error(err);
        showNotification('Erro ao analisar imagem: ' + err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
