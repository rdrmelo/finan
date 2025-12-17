
export function formatCurrency(value, decimals = 2) {
    return (value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

export function formatCurrencyForCharts(value) {
    return formatCurrency(value, 1);
}

export function formatCurrencyForDatalabels(value) {
    return formatCurrency(value, 1);
}
