
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

export function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!email) return { valid: false, message: '' };
    if (!emailRegex.test(email)) return { valid: false, message: 'Formato de email inválido' };
    
    const domain = email.split('@')[1];
    if (!domain) return { valid: false, message: 'Domínio inválido' };
    
    return { valid: true, message: 'Email válido' };
}

export function validateFullName(name) {
    if (!name) return { valid: false, message: '' };
    if (name.length < 2) return { valid: false, message: 'Nome muito curto' };
    if (name.length > 100) return { valid: false, message: 'Nome muito longo' };
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) return { valid: false, message: 'Apenas letras e espaços' };
    if (name.trim().split(' ').length < 2) return { valid: false, message: 'Digite nome e sobrenome' };
    
    return { valid: true, message: 'Nome válido' };
}
