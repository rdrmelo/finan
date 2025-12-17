
import { getAIAnalysis } from './ai.js';
import { formatCurrency } from '../utils/formatters.js';

// Internal helpers
function getPreviousPeriodTransactions(transactions, periodType, periodValue) {
    if (periodType === 'monthly') {
        const [year, month] = periodValue.split('-');
        const currentDate = new Date(year, month - 1, 1);
        const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const previousPeriod = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
        return transactions.filter(t => t.date.startsWith(previousPeriod));
    } else {
        const previousYear = (parseInt(periodValue) - 1).toString();
        return transactions.filter(t => t.date.startsWith(previousYear));
    }
}

function calculateReportFinancialScore(income, expense, netResult, savingsRate, categoryData) {
    let score = 0;

    // Critério 1: Taxa de poupança (30 pontos)
    if (savingsRate >= 20) score += 30;
    else if (savingsRate >= 10) score += 20;
    else if (savingsRate >= 5) score += 10;
    else if (savingsRate > 0) score += 5;

    // Critério 2: Controle de orçamento (25 pontos)
    const budgetCompliance = categoryData.filter(c => c.status === '✅ OK').length;
    const totalCategories = categoryData.length;
    if (totalCategories > 0) {
        const complianceRate = budgetCompliance / totalCategories;
        score += Math.round(complianceRate * 25);
    }

    // Critério 3: Saldo positivo (20 pontos)
    if (netResult > 0) {
        const balanceRatio = netResult / income;
        if (balanceRatio >= 0.2) score += 20;
        else if (balanceRatio >= 0.1) score += 15;
        else if (balanceRatio >= 0.05) score += 10;
        else score += 5;
    }

    // Critério 4: Diversificação de gastos (15 pontos)
    const activeCategories = categoryData.filter(c => c.transactions > 0).length;
    if (activeCategories >= 5) score += 15;
    else if (activeCategories >= 3) score += 10;
    else if (activeCategories >= 2) score += 5;

    // Critério 5: Consistência (10 pontos)
    if (income > 0 && expense > 0) score += 10;

    return Math.min(score, 100);
}

function getExpenseControlLevel(categoryData) {
    const budgetCompliance = categoryData.filter(c => c.status === '✅ OK').length;
    const totalWithBudget = categoryData.filter(c => c.budget !== '-').length;

    if (totalWithBudget === 0) return 'Sem orçamentos definidos';

    const complianceRate = budgetCompliance / totalWithBudget;
    if (complianceRate >= 0.8) return 'Excelente';
    if (complianceRate >= 0.6) return 'Bom';
    if (complianceRate >= 0.4) return 'Regular';
    return 'Precisa melhorar';
}

function getBudgetForCategory(budgets, categoryName, cycleMonthYear) {
    return budgets.find(b => b.category === categoryName && b.month === cycleMonthYear);
}


export async function generatePDF(periodType, periodValue, includeAI, transactions, categories, budgets, expenseChart) {
    if (!window.jspdf) {
        throw new Error("jsPDF not loaded");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let reportTitle = "Relatório Financeiro", fileName = "relatorio.pdf", filteredTransactions = [], periodText = "", monthYear = "";

    if (periodType === 'monthly') {
        const [year, month] = periodValue.split('-');
        monthYear = periodValue;
        const monthName = new Date(periodValue + '-02').toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
        periodText = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
        reportTitle = `Relatório Financeiro - ${periodText}`;
        fileName = `FinanceX_Relatorio_${year}_${month}.pdf`;
        filteredTransactions = transactions.filter(t => t.date.startsWith(periodValue));
    } else {
        periodText = `o ano de ${periodValue}`;
        reportTitle = `Relatório Financeiro - Ano ${periodValue}`;
        fileName = `FinanceX_Relatorio_${periodValue}.pdf`;
        filteredTransactions = transactions.filter(t => t.date.startsWith(periodValue));
    }

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netResult = totalIncome - totalExpense;
    const daysInPeriod = periodType === 'monthly' ? new Date(periodValue.split('-')[0], periodValue.split('-')[1], 0).getDate() : 365;
    const dailyAvgExpense = totalExpense > 0 ? totalExpense / daysInPeriod : 0;

    // === CABEÇALHO PROFISSIONAL ===
    doc.setFillColor(41, 98, 255); // Azul corporativo
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('FinanceX', 14, 20);
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text(reportTitle, 14, 28);
    doc.setFontSize(10);
    const currentDate = new Date().toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Gerado em: ${currentDate}`, 210 - 14, 20, { align: 'right' });
    doc.text(`Período: ${periodText}`, 210 - 14, 28, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    const categoryData = categories.filter(c => c.name.toLowerCase() !== 'salário').map(cat => {
        const transactionsInCategory = filteredTransactions.filter(t => t.category === cat.name && t.type === 'expense');
        const totalSpent = transactionsInCategory.reduce((sum, t) => sum + t.amount, 0);
        const budgetObj = getBudgetForCategory(budgets, cat.name, monthYear);
        const budgetAmount = budgetObj ? budgetObj.amount : 0;
        const status = budgetAmount > 0 ? (totalSpent <= budgetAmount ? '✅ OK' : '⚠️ Acima') : '-';
        return {
            name: cat.name,
            spent: formatCurrency(totalSpent),
            percentage: totalExpense > 0 ? `${((totalSpent / totalExpense) * 100).toFixed(1)}%` : '0.0%',
            transactions: transactionsInCategory.length,
            budget: budgetAmount > 0 ? formatCurrency(budgetAmount) : '-',
            status: status
        };
    }).filter(c => c.transactions > 0).sort((a, b) => parseFloat(b.spent.replace(/[^0-9,-]+/g, "").replace(',', '.')) - parseFloat(a.spent.replace(/[^0-9,-]+/g, "").replace(',', '.')));

    // Calcular dados para análises avançadas
    const previousPeriodTransactions = getPreviousPeriodTransactions(transactions, periodType, periodValue);
    const previousIncome = previousPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const previousExpense = previousPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const incomeVariation = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome * 100) : 0;
    const expenseVariation = previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense * 100) : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;

    const financialScore = calculateReportFinancialScore(totalIncome, totalExpense, netResult, savingsRate, categoryData);

    let startY = 50;

    // === RESUMO EXECUTIVO ===
    doc.setFillColor(248, 250, 252); // Fundo cinza claro
    doc.rect(14, startY - 5, 182, 45, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59); // Azul escuro
    doc.text("📊 RESUMO EXECUTIVO", 20, startY + 5);

    // Cards de métricas principais
    const cardWidth = 42;
    const cardHeight = 25;
    const cardSpacing = 4;
    const cardsStartX = 20;
    const cardsStartY = startY + 12;

    // Card 1 - Receitas
    doc.setFillColor(34, 197, 94); // Verde
    doc.rect(cardsStartX, cardsStartY, cardWidth, cardHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('RECEITAS', cardsStartX + 2, cardsStartY + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrency(totalIncome), cardsStartX + 2, cardsStartY + 15);

    // Card 2 - Despesas
    doc.setFillColor(239, 68, 68); // Vermelho
    doc.rect(cardsStartX + cardWidth + cardSpacing, cardsStartY, cardWidth, cardHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('DESPESAS', cardsStartX + cardWidth + cardSpacing + 2, cardsStartY + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrency(totalExpense), cardsStartX + cardWidth + cardSpacing + 2, cardsStartY + 15);

    // Card 3 - Saldo
    const balanceColor = netResult >= 0 ? [34, 197, 94] : [239, 68, 68];
    doc.setFillColor(...balanceColor);
    doc.rect(cardsStartX + (cardWidth + cardSpacing) * 2, cardsStartY, cardWidth, cardHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('SALDO', cardsStartX + (cardWidth + cardSpacing) * 2 + 2, cardsStartY + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrency(netResult), cardsStartX + (cardWidth + cardSpacing) * 2 + 2, cardsStartY + 15);

    // Card 4 - Média Diária
    doc.setFillColor(59, 130, 246); // Azul
    doc.rect(cardsStartX + (cardWidth + cardSpacing) * 3, cardsStartY, cardWidth, cardHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('MÉDIA/DIA', cardsStartX + (cardWidth + cardSpacing) * 3 + 2, cardsStartY + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrency(dailyAvgExpense), cardsStartX + (cardWidth + cardSpacing) * 3 + 2, cardsStartY + 15);

    // Reset cor do texto
    doc.setTextColor(0, 0, 0);
    startY += 55;

    // === SCORE DE SAÚDE FINANCEIRA ===
    doc.setFillColor(240, 253, 244); // Fundo verde claro
    doc.rect(14, startY - 5, 182, 35, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(22, 101, 52); // Verde escuro
    doc.text("🏥 SCORE DE SAÚDE FINANCEIRA", 20, startY + 5);

    // Score visual com speedometer
    const scoreColor = financialScore >= 80 ? [34, 197, 94] : financialScore >= 60 ? [251, 191, 36] : [239, 68, 68];
    const scoreText = financialScore >= 80 ? 'Excelente' : financialScore >= 60 ? 'Bom' : 'Precisa Melhorar';

    // Círculo do score
    doc.setFillColor(...scoreColor);
    doc.circle(40, startY + 20, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(Math.round(financialScore).toString(), 40, startY + 24, { align: 'center' });

    // Detalhes do score
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    // Align details
    doc.text(`Status: ${scoreText}`, 60, startY + 15);
    doc.text(`Taxa de Poupança: ${savingsRate.toFixed(1)}%`, 60, startY + 22);
    doc.text(`Controle de Gastos: ${getExpenseControlLevel(categoryData)}`, 60, startY + 29);

    startY += 45;

    // === ANÁLISE DE TENDÊNCIAS ===
    doc.setFillColor(254, 249, 195); // Fundo amarelo claro
    doc.rect(14, startY - 5, 182, 40, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(146, 64, 14); // Laranja escuro
    doc.text("📈 ANÁLISE DE TENDÊNCIAS", 20, startY + 5);

    // Comparação com período anterior
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const incomeIcon = incomeVariation >= 0 ? '📈' : '📉';
    const expenseIcon = expenseVariation <= 0 ? '📉' : '📈';
    const incomeColor = incomeVariation >= 0 ? [34, 197, 94] : [239, 68, 68];
    const expenseColor = expenseVariation <= 0 ? [34, 197, 94] : [239, 68, 68];

    doc.text(`${incomeIcon} Receitas vs período anterior:`, 20, startY + 15);
    doc.setTextColor(...incomeColor);
    doc.text(`${incomeVariation >= 0 ? '+' : ''}${incomeVariation.toFixed(1)}%`, 120, startY + 15);

    doc.setTextColor(0, 0, 0);
    doc.text(`${expenseIcon} Despesas vs período anterior:`, 20, startY + 22);
    doc.setTextColor(...expenseColor);
    doc.text(`${expenseVariation >= 0 ? '+' : ''}${expenseVariation.toFixed(1)}%`, 120, startY + 22);

    doc.setTextColor(0, 0, 0);
    doc.text(`💰 Economia projetada próximo período:`, 20, startY + 29);
    const projectedSavings = totalIncome * (savingsRate / 100);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrency(projectedSavings), 120, startY + 29);

    doc.setTextColor(0, 0, 0);
    startY += 50;

    // === INDICADORES FINANCEIROS AVANÇADOS ===
    doc.setFillColor(245, 245, 255); // Fundo roxo claro
    doc.rect(14, startY - 5, 182, 35, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(79, 70, 229); // Roxo escuro
    doc.text("💎 INDICADORES AVANÇADOS", 20, startY + 5);

    // Calcular indicadores
    const emergencyFund = netResult > 0 ? netResult : 0;
    const monthsOfExpenses = totalExpense > 0 ? emergencyFund / (totalExpense / (periodType === 'monthly' ? 1 : 12)) : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome * 100) : 0;
    const avgTransactionValue = filteredTransactions.length > 0 ? (totalIncome + totalExpense) / filteredTransactions.length : 0;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text(`💰 Reserva de emergência: ${monthsOfExpenses.toFixed(1)} meses de gastos`, 20, startY + 15);
    doc.text(`📊 Relação despesa/receita: ${expenseRatio.toFixed(1)}%`, 20, startY + 22);
    doc.text(`💳 Valor médio por transação: ${formatCurrency(avgTransactionValue)}`, 20, startY + 29);

    startY += 45;

    // === TOP 5 MAIORES GASTOS ===
    doc.setFillColor(255, 242, 242); // Fundo vermelho claro
    doc.rect(14, startY - 5, 182, 45, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(185, 28, 28); // Vermelho escuro
    doc.text("🔥 TOP 5 MAIORES GASTOS", 20, startY + 5);

    // Obter os 5 maiores gastos
    const topExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    topExpenses.forEach((expense, index) => {
        const yPos = startY + 15 + (index * 5);
        const date = new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        doc.text(`${index + 1}. ${expense.description} (${date})`, 20, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(expense.amount), 160, yPos);
        doc.setFont(undefined, 'normal');
    });

    startY += 55;

    if (includeAI) {
        // === ANÁLISE INTELIGENTE ===
        doc.setFillColor(255, 251, 235); // Fundo amarelo claro
        doc.rect(14, startY - 5, 182, 35, 'F');

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(146, 64, 14); // Laranja escuro
        doc.text("🤖 ANÁLISE INTELIGENTE", 20, startY + 5);

        const categorySummaryForAI = categories.filter(c => c.name.toLowerCase() !== 'salário').map(cat => {
            const spent = filteredTransactions.filter(t => t.category === cat.name && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const budget = getBudgetForCategory(budgets, cat.name, monthYear)?.amount || 0;
            return { Categoria: cat.name, Gasto: formatCurrency(spent), Orçamento: budget > 0 ? formatCurrency(budget) : 'N/A' };
        });

        const prompt = `Analise os seguintes dados financeiros para ${periodText}. Resumo: Receitas (${formatCurrency(totalIncome)}), Despesas (${formatCurrency(totalExpense)}), Saldo (${formatCurrency(netResult)}). Detalhes por Categoria: ${JSON.stringify(categorySummaryForAI)}. Forneça uma análise concisa em português, destacando a categoria de maior gasto, o status dos orçamentos e uma dica prática de economia. Formate em um único parágrafo.`;

        try {
            const apiKey = localStorage.getItem(Object.keys(localStorage).find(k => k.includes('gemini_api_key')) || 'API_KEY');
            if (apiKey) {
                const aiAnalysisText = await getAIAnalysis(prompt, apiKey);
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                const splitText = doc.splitTextToSize(aiAnalysisText, 175);
                doc.text(splitText, 20, startY + 15);
            } else {
                doc.text("Análise AI não disponível (Chave API ausente)", 20, startY + 15);
            }
        } catch (e) {
            doc.text("Erro ao gerar análise AI", 20, startY + 15);
        }
        startY += 45;
    }

    // === ANÁLISE POR CATEGORIAS ===
    doc.setFillColor(240, 249, 255); // Fundo azul claro
    doc.rect(14, startY - 5, 182, 95, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 64, 175); // Azul escuro
    doc.text("📈 ANÁLISE POR CATEGORIAS", 20, startY + 5);

    // Gráfico de pizza
    if (expenseChart) {
        try {
            const chartImage = expenseChart.toBase64Image();
            doc.addImage(chartImage, 'PNG', 20, startY + 10, 75, 75);
        } catch (e) { console.warn("Cannot add chart image", e); }
    }

    doc.autoTable({
        head: [['Categoria', 'Gasto', '%', 'Qtd', 'Orçamento', 'Status']],
        body: categoryData.map(c => [c.name, c.spent, c.percentage, c.transactions, c.budget, c.status]),
        startY: startY + 10,
        margin: { left: 105 },
        theme: 'striped',
        headStyles: {
            fillColor: [30, 64, 175], // Azul escuro
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.5
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'center' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    startY += 105;

    // === SEGUNDA PÁGINA - DETALHAMENTO ===
    doc.addPage();

    // Cabeçalho da segunda página
    doc.setFillColor(41, 98, 255);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('FinanceX - Detalhamento de Transações', 14, 16);

    // Reset cor do texto
    doc.setTextColor(0, 0, 0);

    // Título da seção
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 35, 182, 15, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("📋 TODAS AS TRANSAÇÕES DO PERÍODO", 20, 45);

    // Reset cor do texto
    doc.setTextColor(0, 0, 0);

    // Tabela de transações com design profissional
    doc.autoTable({
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: filteredTransactions.map(t => [
            new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            t.description,
            t.category,
            t.type === 'income' ? '💰 Receita' : '💸 Despesa',
            { content: formatCurrency(t.amount), styles: { halign: 'right', fontStyle: 'bold' } }
        ]),
        startY: 55,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 64, 175],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            cellPadding: 4
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.5
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 25 },
            1: { cellWidth: 60 },
            2: { halign: 'center', cellWidth: 30 },
            3: { halign: 'center', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
    });

    // Rodapé profissional
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`FinanceX - Sistema de Gestão Financeira | Página ${i} de ${pageCount}`, 14, 285);
        doc.text(`Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`, 210 - 14, 285, { align: 'right' });
    }

    doc.save(fileName);
}
