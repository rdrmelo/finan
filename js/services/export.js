
export function exportTransactionsToCSV(transactions) {
    if (!transactions || transactions.length === 0) return null;

    const headers = ['ID', 'Data', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Tags'];
    const rows = transactions.map(t => [
        t.id,
        t.date,
        t.type === 'income' ? 'Receita' : 'Despesa',
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2).replace('.', ','),
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.tags || []).join(', ')}"`
    ]);

    const csvContent = [headers.join(';')]
        .concat(rows.map(r => r.join(';')))
        .join('\n');

    return csvContent;
}

export function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
