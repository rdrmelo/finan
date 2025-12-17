
// AI Service for FinanceX using Gemini API

export async function getAIAnalysis(prompt, apiKey) {
    if (!apiKey) {
        throw new Error("Chave da API do Gemini não configurada.");
    }

    // Check if key is available in localStorage if not passed? 
    // Best practice: caller provides key or we retrieve it here if we trust localStorage access in service.
    // For now we accept it as argument or fallback.

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Gemini API Error:", error);
            throw new Error(error.error?.message || "Erro na resposta da API.");
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Nenhuma resposta gerada pela IA.");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Erro ao chamar a API Gemini: ", error);
        throw error;
    }
}


export async function analyzeImage(imageBase64, prompt, apiKey) {
    if (!apiKey) throw new Error("Chave da API necessária.");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: imageBase64
                    }
                }
            ]
        }]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Erro na API de Visão.");
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Erro Vision:", error);
        throw error;
    }
}

export function generateFinancialPrompt(transactions, budgets, goals, period) {
    // Construct a context-aware prompt
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    const categories = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const topCategories = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, amount]) => `${cat}: R$ ${amount.toFixed(2)}`)
        .join(', ');

    return `Atue como um consultor financeiro pessoal especialista. Analise meus dados financeiros de ${period}:
    - Receita Total: R$ ${income.toFixed(2)}
    - Despesa Total: R$ ${expense.toFixed(2)}
    - Saldo: R$ ${balance.toFixed(2)}
    - Maiores Gastos: ${topCategories}
    - Metas Ativas: ${goals.length}
    
    Por favor, forneça:
    1. Uma breve análise da minha saúde financeira.
    2. 3 dicas práticas para economizar com base nos meus maiores gastos.
    3. Uma sugestão de investimento conservador para o meu saldo (se positivo) ou estratégia para sair do vermelho.
    
    Responda em formato HTML amigável (sem tags html/body, apenas p, ul, li, strong) e use emojis. Seja direto e encorajador.`;
}
