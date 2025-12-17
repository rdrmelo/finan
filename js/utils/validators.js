// Validação de senha robusta
export function validatePassword(password) {
    const criteria = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const score = Object.values(criteria).filter(Boolean).length;
    return { criteria, score };
}

export function updatePasswordStrength(password) {
    const validation = validatePassword(password);
    const { criteria, score } = validation;

    // Atualizar barras de força
    const bars = ['strength-bar-1', 'strength-bar-2', 'strength-bar-3', 'strength-bar-4'];
    bars.forEach((barId, index) => {
        const bar = document.getElementById(barId);
        if (!bar) return; // Segurança caso o elemento não exista

        if (index < score) {
            if (score <= 2) bar.className = 'h-1 flex-1 bg-red-500 rounded';
            else if (score <= 3) bar.className = 'h-1 flex-1 bg-yellow-500 rounded';
            else bar.className = 'h-1 flex-1 bg-green-500 rounded';
        } else {
            bar.className = 'h-1 flex-1 bg-gray-600 rounded';
        }
    });

    // Atualizar texto de força
    const strengthText = document.getElementById('password-strength-text');
    if (strengthText) {
        if (password.length === 0) {
            strengthText.textContent = 'Digite uma senha';
            strengthText.className = 'text-xs text-gray-400';
        } else if (score <= 2) {
            strengthText.textContent = 'Senha fraca';
            strengthText.className = 'text-xs text-red-400';
        } else if (score <= 3) {
            strengthText.textContent = 'Senha média';
            strengthText.className = 'text-xs text-yellow-400';
        } else if (score === 4) {
            strengthText.textContent = 'Senha boa';
            strengthText.className = 'text-xs text-blue-400';
        } else {
            strengthText.textContent = 'Senha excelente';
            strengthText.className = 'text-xs text-green-400';
        }
    }

    // Atualizar requisitos
    const requirements = {
        'req-length': criteria.length,
        'req-uppercase': criteria.uppercase,
        'req-lowercase': criteria.lowercase,
        'req-number': criteria.number,
        'req-special': criteria.special
    };

    Object.entries(requirements).forEach(([reqId, met]) => {
        const req = document.getElementById(reqId);
        if (req) {
            const icon = req.querySelector('span');
            if (met) {
                icon.textContent = '✓';
                icon.className = 'text-green-400';
                req.className = 'flex items-center space-x-2 text-green-400';
            } else {
                icon.textContent = '○';
                icon.className = 'text-gray-400';
                req.className = 'flex items-center space-x-2 text-gray-400';
            }
        }
    });

    return score >= 4;
}

// Validação de email avançada
export function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email) return { valid: false, message: '' };
    if (!emailRegex.test(email)) return { valid: false, message: 'Formato de email inválido' };

    const domain = email.split('@')[1];
    if (!domain) return { valid: false, message: 'Domínio inválido' };

    return { valid: true, message: 'Email válido' };
}

export function updateEmailValidation(email) {
    const validation = validateEmail(email);
    const statusIcon = document.getElementById('email-status');
    const errorDiv = document.getElementById('email-error');

    if (!statusIcon || !errorDiv) return false;

    if (!email) {
        statusIcon.textContent = '';
        errorDiv.classList.add('hidden');
        return false;
    }

    if (validation.valid) {
        statusIcon.textContent = '✓';
        statusIcon.className = 'text-green-400';
        errorDiv.classList.add('hidden');
        return true;
    } else {
        statusIcon.textContent = '✗';
        statusIcon.className = 'text-red-400';
        errorDiv.textContent = validation.message;
        errorDiv.classList.remove('hidden');
        return false;
    }
}

// Validação de nome completo
export function validateFullName(name) {
    if (!name) return { valid: false, message: '' };
    if (name.length < 2) return { valid: false, message: 'Nome muito curto' };
    if (name.length > 100) return { valid: false, message: 'Nome muito longo' };
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) return { valid: false, message: 'Apenas letras e espaços' };
    if (name.trim().split(' ').length < 2) return { valid: false, message: 'Digite nome e sobrenome' };

    return { valid: true, message: 'Nome válido' };
}

export function updateFullNameValidation(name) {
    const validation = validateFullName(name);
    const statusIcon = document.getElementById('fullname-status');
    const errorDiv = document.getElementById('fullname-error');

    if (!statusIcon || !errorDiv) return false;

    if (!name) {
        statusIcon.textContent = '';
        errorDiv.classList.add('hidden');
        return false;
    }

    if (validation.valid) {
        statusIcon.textContent = '✓';
        statusIcon.className = 'text-green-400';
        errorDiv.classList.add('hidden');
        return true;
    } else {
        statusIcon.textContent = '✗';
        statusIcon.className = 'text-red-400';
        errorDiv.textContent = validation.message;
        errorDiv.classList.remove('hidden');
        return false;
    }
}

// Validação de confirmação de senha
export function updateConfirmPasswordValidation(password, confirmPassword) {
    const statusIcon = document.getElementById('confirm-password-status');
    const errorDiv = document.getElementById('confirm-password-error');

    if (!statusIcon || !errorDiv) return false;

    if (!confirmPassword) {
        statusIcon.textContent = '';
        errorDiv.classList.add('hidden');
        return false;
    }

    if (password === confirmPassword) {
        statusIcon.textContent = '✓';
        statusIcon.className = 'text-green-400';
        errorDiv.classList.add('hidden');
        return true;
    } else {
        statusIcon.textContent = '✗';
        statusIcon.className = 'text-red-400';
        errorDiv.textContent = 'Senhas não coincidem';
        errorDiv.classList.remove('hidden');
        return false;
    }
}
