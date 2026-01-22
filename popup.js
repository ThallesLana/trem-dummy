document.getElementById('fillBtn').addEventListener('click', async () => {
    const btn = document.getElementById('fillBtn');
    const prevText = btn.innerText;
    btn.innerText = "GERANDO...";
    btn.disabled = true;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch('https://randomuser.me/api/?nat=br', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`Falha ao buscar dados: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        const user = result?.results?.[0];
        if (!user) {
            throw new Error('Resposta inválida da API de usuário');
        }

        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            throw new Error('Aba ativa não encontrada');
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: fillForm,
            args: [user, generateCPF(), generateLuhnCard(), generateBirthDate()]
        });
    } catch (err) {
        console.error("Erro ao buscar dados:", err);
    } finally {
        btn.innerText = prevText || "GERAR E PREENCHER";
        btn.disabled = false;
    }
});

// Algoritmo de Luhn para Cartão de Crédito Válido (Visa)
function generateLuhnCard() {
    let card = [4]; // Começa com 4 para ser Visa
    while (card.length < 15) {
        card.push(Math.floor(Math.random() * 10));
    }
    let sum = 0;
    for (let i = 0; i < card.length; i++) {
        let digit = card[card.length - 1 - i];
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    card.push((10 - (sum % 10)) % 10);
    return card.join('');
}

// Gera data de nascimento para uma pessoa entre 18 e 50 anos
function generateBirthDate() {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 50);
    const end = new Date();
    end.setFullYear(end.getFullYear() - 18);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    return {
        iso: date.toISOString().split('T')[0], // yyyy-mm-dd para inputs tipo date
        br: date.toLocaleDateString('pt-BR'),  // dd/mm/yyyy para inputs de texto
        day: date.getDate().toString().padStart(2, '0'),
        month: (date.getMonth() + 1).toString().padStart(2, '0'),
        year: date.getFullYear()
    };
}

function generateCPF() {
    const n = () => Math.floor(Math.random() * 10);
    const n1=n(), n2=n(), n3=n(), n4=n(), n5=n(), n6=n(), n7=n(), n8=n(), n9=n();
    let d1 = n9*2+n8*3+n7*4+n6*5+n5*6+n4*7+n3*8+n2*9+n1*10;
    d1 = 11 - (d1 % 11); if (d1 >= 10) d1 = 0;
    let d2 = d1*2+n9*3+n8*4+n7*5+n6*6+n5*7+n4*8+n3*9+n2*10+n1*11;
    d2 = 11 - (d2 % 11); if (d2 >= 10) d2 = 0;
    return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
}

function fillForm(user, cpf, card, bday) {
    const data = {
        name: `${user.name.first} ${user.name.last}`,
        email: user.email,
        phone: user.cell.replace(/\D/g, ''),
        zip: user.location.postcode.toString().replace(/\D/g, ''),
        city: user.location.city,
        street: `${user.location.street.name}, ${user.location.street.number}`,
        cpf: cpf,
        card: card,
        bday: bday,
        password: "Dev@Pass2026!" // Re-adicionado
    };

    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        if (input.disabled || input.readOnly) return;

        const setValue = (value) => {
            const newValue = value == null ? '' : String(value);
            if (input.value === newValue) return false;
            input.value = newValue;
            ['input', 'change', 'blur'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
            return true;
        };

        // Pegamos tudo que pode identificar o campo
        const autocomplete = (input.autocomplete || '').toLowerCase();
        const attr = (
            (input.name || '') +
            (input.id || '') +
            (input.placeholder || '') +
            (input.className || '') +
            autocomplete
        ).toLowerCase();

        // 1. Cartão (Adicionado 'cc' e 'number' como chaves)
        if (
            autocomplete.includes('cc-number') ||
            attr.includes('card') ||
            attr.includes('cartao') ||
            attr.includes('credit') ||
            attr.includes('cc_') ||
            attr.includes('cc-') ||
            attr.includes('cardnumber') ||
            attr.includes('card_number') ||
            attr.includes('card-number')
        ) {
            if (!attr.includes('home') && !attr.includes('house') && !attr.includes('address')) {
                setValue(data.card);
            }
        }

        // 2. Senha (Faltava essa verificação na última versão)
        else if (input.type === 'password' || autocomplete.includes('password') || attr.includes('pass') || attr.includes('senha')) {
            setValue(data.password);
        }

        // 3. Nome
        else if (attr.includes('nome') || attr.includes('name') || attr.includes('customer')) {
            setValue(data.name);
        }

        // 4. Endereço / Logradouro (Ajustado para 'address' e 'street')
        else if (attr.includes('address') || attr.includes('street') || attr.includes('logradouro') || attr.includes('rua')) {
            setValue(data.street);
        }

        // 5. Bio / Textarea (Geralmente campos vazios em branco)
        else if (input.tagName === 'TEXTAREA' || attr.includes('bio') || attr.includes('obs')) {
            setValue("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Teste de desenvolvedor.");
        }

        // 6. Restante dos campos (Mantidos)
        else if (autocomplete.includes('email') || attr.includes('email')) setValue(data.email);
        else if (attr.includes('cpf')) setValue(data.cpf);
        else if (autocomplete.includes('postal-code') || attr.includes('cep') || attr.includes('zip')) setValue(data.zip);
        else if (attr.includes('cidade') || attr.includes('city')) setValue(data.city);
        else if (autocomplete.includes('tel') || attr.includes('tel') || attr.includes('phone')) setValue(data.phone);
        else if (attr.includes('birth') || attr.includes('nasc')) {
            setValue((input.type === 'date') ? data.bday.iso : data.bday.br);
        }
        else if (autocomplete.includes('cc-csc') || attr.includes('cvv') || attr.includes('security')) setValue("123");
        else if (autocomplete.includes('cc-exp') || attr.includes('exp') || attr.includes('valida')) setValue("12/29");
    });
}
