console.log('Iniciando aplicação...');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/';

    class CharacterSheet {
        constructor() {
            this.abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            this.currentClass = null;
            this.characterLevel = 1;
            this.init();
        }

        async init() {
            await this.loadClassList();
            this.setupEventListeners();
            this.calculateAll();
        }

      // Carregar lista de classes a partir do index.json
async loadClassList() {
    try {
        const response = await axios.get(`${apiBase}index.json`);

        // Log para verificar todas as chaves da resposta da API
        console.log('Estrutura completa da resposta da API:', response.data);

        // Aqui logamos as chaves para visualizar melhor a estrutura
        console.log('Chaves disponíveis na resposta:', Object.keys(response.data));

        // Tentar acessar as classes de uma maneira mais flexível
        const classList = response.data; // Agora estamos diretamente acessando o objeto com as chaves das classes

        // Verifique a estrutura e os dados
        console.log('Estrutura das classes:', classList);

        if (!classList || Object.keys(classList).length === 0) {
            throw new Error('Nenhuma classe encontrada.');
        }

        this.gameData = {
            classes: Object.keys(classList) // Usando as chaves do objeto para preencher as classes
        };

        // Popular o dropdown de classes
        this.populateClassSelect();
        
    } catch (error) {
        console.error('Erro ao carregar classes:', error);
        alert('Erro ao carregar classes! Verifique o console (F12) para mais detalhes.');
    }
}

// Popular o dropdown com as opções de classes
populateClassSelect() {
    const classSelect = document.getElementById('classSelect');
    classSelect.innerHTML = '<option value="">Selecione uma classe</option>';
    
    // Preencher o dropdown com base nas classes disponíveis no index.json
    this.gameData.classes.forEach(cls => {
        const option = document.createElement('option');
        
        // Aqui vamos garantir que estamos passando o nome correto da classe para o valor
        option.value = cls; // Usando o nome da chave da classe
        option.textContent = cls.charAt(0).toUpperCase() + cls.slice(1); // Capitalizando a primeira letra
        
        classSelect.appendChild(option);
    });
}

// Carregar detalhes da classe selecionada
async loadClassFeatures(className) {
    try {
        const classSlug = className.toLowerCase(); // Garantir que estamos trabalhando com uma string válida
        const detailsUrl = `${apiBase}${response.data[classSlug]}`; // Usando a URL da classe selecionada

        const classResponse = await axios.get(detailsUrl);
        this.currentClass = classResponse.data;

        console.log('Classe carregada:', this.currentClass);
        this.updateClassFeatures();
        this.updateProficiencies();
        this.updateSavingThrows();
        
    } catch (error) {
        console.error('Erro ao carregar recursos da classe:', error);
        alert('Erro ao carregar detalhes da classe!');
    }
}

        // Atualizar os recursos de classe com base no nível
        updateClassFeatures() {
            const resourcesContainer = document.getElementById('classResources');
            resourcesContainer.innerHTML = '';

            if(!this.currentClass?.feature) return;

            const features = this.currentClass.feature
                .filter(f => f.gainedAt?.level === this.characterLevel)
                .map(f => this.createFeatureElement(f));

            features.forEach(feature => {
                resourcesContainer.appendChild(feature);
            });
        }

        // Criar um item de recurso de classe
        createFeatureElement(feature) {
            const div = document.createElement('div');
            div.className = 'feature-item';
            div.innerHTML = `
                <h4>${feature.name}</h4>
                <p>${feature.entries.join('<br>')}</p>
            `;
            return div;
        }

        // Atualizar as proficiências do personagem
        updateProficiencies() {
            const skillList = document.querySelector('.skill-list');
            skillList.innerHTML = '';

            if(!this.currentClass) return;

            const proficienciesHTML = (this.currentClass.proficiency || [])
                .map(p => `
                    <div class="proficiency-item">
                        <input type="checkbox" checked disabled>
                        <label>${p}</label>
                    </div>
                `).join('');

            const skillChoices = (this.currentClass.skillProficiencies || [])
                .map(choice => `
                    <div class="skill-choice">
                        <h4>Escolha ${choice.choose} entre:</h4>
                        ${choice.from.map(skill => `
                            <div class="skill-option">
                                <input type="checkbox" name="selectedSkills">
                                <label>${skill}</label>
                            </div>
                        `).join('')}
                    </div>
                `).join('');

            skillList.innerHTML = `
                <h3>Proficiências</h3>
                ${proficienciesHTML}
                ${skillChoices}
            `;
        }

        // Atualizar as jogadas de resistência
        updateSavingThrows() {
            const savingThrows = document.querySelector('.saving-throws');
            savingThrows.innerHTML = (this.currentClass?.savingThrows || [])
                .map(ab => `
                    <div class="saving-throw">
                        <input type="checkbox" checked disabled>
                        <label>${ab.toUpperCase()}</label>
                    </div>
                `).join('');
        }

        // Calcular bônus de proficiência
        calculateProficiencyBonus() {
            return Math.ceil(2 + this.characterLevel/4);
        }

        // Calcular modificadores de atributos
        calculateAll() {
            this.abilities.forEach(ability => {
                const score = parseInt(document.querySelector(`[data-ability="${ability}"] .score`).value) || 10;
                const mod = Math.floor((score - 10) / 2);
                document.querySelector(`[data-ability="${ability}"] .mod`).textContent = mod >= 0 ? `+${mod}` : mod;
            });
        }

        // Configuração de eventos
        setupEventListeners() {
            // Atualizar modificadores de atributo
            this.abilities.forEach(ability => {
                document.querySelector(`[data-ability="${ability}"] .score`)
                    .addEventListener('input', () => this.calculateAll());
            });

            // Seleção de classe
            document.getElementById('classSelect').addEventListener('change', (e) => {
                if(e.target.value) this.loadClassFeatures(e.target.value);
            });

            // Controle de nível
            document.getElementById('characterLevel').addEventListener('input', (e) => {
                this.characterLevel = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                e.target.value = this.characterLevel;
                document.getElementById('profBonus').textContent = `+${this.calculateProficiencyBonus()}`;
                this.updateClassFeatures();
            });

            // Botão de level up
            document.getElementById('levelUpButton').addEventListener('click', () => {
                this.characterLevel = Math.min(20, this.characterLevel + 1);
                document.getElementById('characterLevel').value = this.characterLevel;
                document.getElementById('profBonus').textContent = `+${this.calculateProficiencyBonus()}`;
                this.updateClassFeatures();
            });
        }
    }

    new CharacterSheet();
});
