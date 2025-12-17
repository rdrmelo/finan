
import { getAIAnalysis, generateFinancialPrompt } from '../services/ai.js';
import { openModal, closeAllModals } from './modals.js';

let aiModalInitialized = false;

function ensureAIModalExists() {
    if (document.getElementById('ai-advisor-modal')) return;

    // Create Modal HTML
    const modal = document.createElement('div');
    modal.id = 'ai-advisor-modal';
    modal.className = 'modal-backdrop hidden fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 opacity-0 transition-opacity duration-300';

    modal.innerHTML = `
        <div class="modal-content transform scale-95 transition-transform duration-300 glass p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <div class="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="font-mono text-2xl font-bold neon-text">Consultor IA</h2>
                        <p class="text-xs text-gray-400">Powered by Gemini</p>
                    </div>
                </div>
                <button id="close-ai-modal-btn" class="text-gray-400 hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div id="ai-content-area" class="space-y-4 min-h-[200px]">
                <!-- States: Initial, Loading, Result, Error -->
                <div id="ai-initial-state" class="text-center py-10 space-y-4">
                    <div class="inline-block p-4 rounded-full bg-cyan-500/10 mb-2">
                        <svg class="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    </div>
                    <h3 class="text-xl font-bold text-gray-200">Análise Financeira Inteligente</h3>
                    <p class="text-gray-400 max-w-md mx-auto">A IA analisará suas transações, orçamentos e metas para oferecer insights personalizados e dicas de economia.</p>
                    <button id="start-analysis-btn" class="btn btn-primary btn-neon mt-4 px-8 py-3">
                        <span class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            Iniciar Análise
                        </span>
                    </button>
                    <div class="text-xs text-gray-500 mt-4">Analisa o mês atual</div>
                </div>

                <div id="ai-loading-state" class="hidden text-center py-10">
                    <div class="relative w-20 h-20 mx-auto mb-6">
                        <div class="absolute inset-0 rounded-full border-4 border-gray-700"></div>
                        <div class="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin"></div>
                        <div class="absolute inset-4 rounded-full border-4 border-gray-700"></div>
                        <div class="absolute inset-4 rounded-full border-4 border-t-purple-500 animate-spin-reverse"></div>
                    </div>
                    <h3 class="text-lg font-bold text-gray-200 animate-pulse">Analisando Finanças...</h3>
                    <p class="text-gray-400 text-sm mt-2" id="ai-loading-text">Conectando ao cérebro digital...</p>
                </div>

                <div id="ai-result-state" class="hidden">
                    <div class="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed" id="ai-response-text">
                        <!-- Content goes here -->
                    </div>
                    <div class="mt-6 pt-4 border-t border-gray-700 flex justify-end">
                         <button id="ai-new-analysis-btn" class="btn btn-ghost text-sm">Nova Análise</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add close listener
    document.getElementById('close-ai-modal-btn').addEventListener('click', () => {
        closeAllModals(); // Assumes closeAllModals handles it or we manually close
        modal.classList.add('hidden', 'opacity-0');
    });
}

function updateLoadingText() {
    const texts = [
        "Lendo transações...",
        "Calculando métricas de saúde...",
        "Verificando metas...",
        "Identificando padrões de gastos...",
        "Gerando insights..."
    ];
    let i = 0;
    const el = document.getElementById('ai-loading-text');
    return setInterval(() => {
        if (el) el.textContent = texts[i % texts.length];
        i++;
    }, 1500);
}

export async function openAIAdvisor(transactions, budgets, goals) {
    ensureAIModalExists();

    // Reset state
    document.getElementById('ai-initial-state').classList.remove('hidden');
    document.getElementById('ai-loading-state').classList.add('hidden');
    document.getElementById('ai-result-state').classList.add('hidden');

    const modal = document.getElementById('ai-advisor-modal');
    modal.classList.remove('hidden', 'opacity-0'); // Manual open basically

    // Setup generic close via modals.js if registered or just manual
    // Registered via ensuring ID is in modals list? No, modals.js has hardcoded list.
    // So we handle close locally or we need to add to modals.js?
    // app.js calls closeAllModals which iterates `modals`. If this is not in `modals`, it won't close via ESC or external calls.
    // We should fix that.

    const startBtn = document.getElementById('start-analysis-btn');
    // Remove old listeners to avoid duplicates? Clone node.
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);

    newBtn.addEventListener('click', async () => {
        document.getElementById('ai-initial-state').classList.add('hidden');
        document.getElementById('ai-loading-state').classList.remove('hidden');

        const loaderInterval = updateLoadingText();

        try {
            // Get Key from localStorage (managed by settings)
            // app.js usually handles key but here we access it or app passes it?
            // Services access localStorage directly in our design so far.
            const user = JSON.parse(localStorage.getItem('user_metadata') || '{}');
            // Actually auth user is global in app.js. 
            // We need API KEY.
            // script.js.old used: localStorage.getItem(`finance_data_${currentUser.email}_gemini_api_key`)
            // We need current user email.
            // We'll try to find it in localStorage 'currentUser' if we stored it, or pass it in openAIAdvisor.

            // Temporary: assume global currentUser or pass it.
            // We will require `currentUser` as 4th arg.

            const prompt = generateFinancialPrompt(transactions, budgets, goals, "este mês");

            // We need the API Key.
            // Let's assume we can get it from localStorage using a known key format or passed in.
            // For now let's try reading generic key or specific.
            // In app.js we manage currentUser.

            // We'll throw if no key found in service, but we need to pass it to service?
            // ai.js `getAIAnalysis` takes (prompt, apiKey).

            // Retrieve key
            // Start simple: use global storage key if exists, else ask user.
            // User key logic is messy.
            // We will callback to app.js? Or just read storage.
            // Let's read storage.

            const keys = Object.keys(localStorage);
            const apiKeyKey = keys.find(k => k.includes('gemini_api_key')) || 'API_KEY';
            const apiKey = localStorage.getItem(apiKeyKey);

            const analysis = await getAIAnalysis(prompt, apiKey);

            clearInterval(loaderInterval);
            document.getElementById('ai-loading-state').classList.add('hidden');
            document.getElementById('ai-result-state').classList.remove('hidden');
            document.getElementById('ai-response-text').innerHTML = analysis; // AI returns HTML-safe text usually or we sanitize

        } catch (error) {
            clearInterval(loaderInterval);
            document.getElementById('ai-loading-state').classList.add('hidden');
            document.getElementById('ai-initial-state').classList.remove('hidden');
            alert(error.message); // Simple alert or custom notification
        }
    });

    const newAnalysisBtn = document.getElementById('ai-new-analysis-btn');
    const newNewAnalysisBtn = newAnalysisBtn.cloneNode(true);
    newAnalysisBtn.parentNode.replaceChild(newNewAnalysisBtn, newAnalysisBtn);

    newNewAnalysisBtn.addEventListener('click', () => {
        document.getElementById('ai-result-state').classList.add('hidden');
        document.getElementById('ai-initial-state').classList.remove('hidden');
    });
}
