
export const BADGES = [
    {
        id: 'first_step',
        name: 'Primeiro Passo',
        description: 'Criou a primeira transação.',
        icon: '🦶',
        check: (transactions, goals, budgets) => transactions.length > 0
    },
    {
        id: 'start_saving',
        name: 'Início da Poupança',
        description: 'Criou o primeiro cofrinho.',
        icon: '🐷',
        check: (transactions, goals, budgets) => goals.length > 0
    },
    {
        id: 'goal_getter',
        name: 'Conquistador',
        description: 'Atingiu uma meta financeira.',
        icon: '🏆',
        check: (transactions, goals, budgets) => goals.some(g => g.savedAmount >= g.targetAmount && g.targetAmount > 0)
    },
    {
        id: 'budget_master',
        name: 'Mestre do Orçamento',
        description: 'Definiu orçamentos para categorias.',
        icon: '📝',
        check: (transactions, goals, budgets) => budgets.length > 0
    },
    {
        id: 'data_collector',
        name: 'Colecionador de Dados',
        description: 'Registrou 50 transações.',
        icon: '📊',
        check: (transactions, goals, budgets) => transactions.length >= 50
    },
    {
        id: 'super_saver',
        name: 'Super Poupador',
        description: 'Economizou mais de 20% da renda no mês atual.',
        icon: '💎',
        check: (transactions, goals, budgets) => {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const income = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
            const expense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
            return income > 0 && ((income - expense) / income) >= 0.2;
        }
    }
];

export function getUnlockedBadges(transactions, goals, budgets) {
    return BADGES.filter(badge => badge.check(transactions, goals, budgets)).map(b => b.id);
}

export function getBadgeDetails(badgeId) {
    return BADGES.find(b => b.id === badgeId);
}
