
// Wrapper for Web Speech API

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const isVoiceSupported = !!SpeechRecognition;

export function startListening(onResult, onError) {
    if (!isVoiceSupported) {
        onError("Reconhecimento de voz não suportado neste navegador.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
    };

    recognition.onerror = (event) => {
        onError(event.error);
    };

    recognition.start();
}

export function parseTransactionCommand(text) {
    text = text.trim();
    // Normalize text
    const lowerText = text.toLowerCase();

    // Regex patterns
    // Expense: "Gastei 50 reais em almoço"
    const expenseRegex = /(gastei|paguei|comprei|despesa)\s+(?:de\s+)?(?:R\$)?\s*([\d.,]+)\s*(?:reais|conto)?\s*(?:em|no|na|com)?\s+(.+)/i;

    // Income: "Recebi 1000 reais de salário"
    const incomeRegex = /(recebi|ganhei|entrada|depósito)\s+(?:de\s+)?(?:R\$)?\s*([\d.,]+)\s*(?:reais|conto)?\s*(?:de|do|da|com|em)?\s+(.+)/i;

    let match = lowerText.match(expenseRegex);
    if (match) {
        return {
            type: 'expense',
            amount: parseFloat(match[2].replace(',', '.')),
            description: match[3].trim(),
            raw: text
        };
    }

    match = lowerText.match(incomeRegex);
    if (match) {
        return {
            type: 'income',
            amount: parseFloat(match[2].replace(',', '.')),
            description: match[3].trim(),
            raw: text
        };
    }

    // Fallback: search for number
    const numberMatch = text.match(/(\d+(?:[.,]\d{2})?)/);
    if (numberMatch) {
        // Guess type: default to expense if ambiguous
        const type = (lowerText.includes('recebi') || lowerText.includes('ganhei')) ? 'income' : 'expense';
        return {
            type: type,
            amount: parseFloat(numberMatch[0].replace(',', '.')),
            description: text.replace(numberMatch[0], '').trim() || 'Comando de voz',
            raw: text
        };
    }

    return null;
}
