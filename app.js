// app.js atualizado
console.log('Iniciando aplicação...');
document.addEventListener('DOMContentLoaded', async () => {
    
    const apiBase = 'https://api.open5e.com/';
    
    
    class CharacterSheet {
        constructor() {
            this.abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            this.currentClass = null;
            this.characterLevel = 1;
            this.init();
        }

        async init() {
            await this.loadData();
            this.setupEventListeners();
            this.calculateAll();
        }

        async loadData() {
            try {
                const response = await axios.get(apiBase + 'classes/');
                console.log('Dados crus:', response.data);
                
                this.gameData = {
                    classes: response.data.filter(c => 
                        c.document__slug === 'wotc-srd' || 
                        c.document__slug === 'tce'
                    ),
                    subclasses: []
                };
                
                console.log('Classes filtradas:', this.gameData.classes);
                this.populateClassSelect();
                
            } catch (error) {
                console.error('Erro final:', error);
                alert('Sistema temporariamente indisponível. Tente recarregar (CTRL+F5).');
            }
        }

        populateClassSelect() {
            const classSelect = document.getElementById('classSelect');
            classSelect.innerHTML = '<option value="">Selecione uma classe</option>';
            
            this.gameData.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.slug; // Usar slug oficial da API
                option.textContent = cls.name;
                classSelect.appendChild(option);
            });
        }

        async loadSubclasses(className) {
            try {
                const proxy = 'https://cors-anywhere.herokuapp.com/';
                const response = await axios.get(
                    `${proxy}https://5e-bits.github.io/api/subclasses/${className.toLowerCase()}.json`
                );
                return response.data;
            } catch (error) {
                console.error('Error loading subclasses:', error);
                return [];
            }
        }

        async loadClassFeatures(className) {
            try {
                const classData = this.gameData.classes.find(c => c.name === className);
                const response = await axios.get(apiBase + `classes/${classData.slug}/`);
                
                this.currentClass = response.data;
                this.updateClassFeatures();
                this.updateProficiencies();
                this.updateSavingThrows();
                
            } catch (error) {
                console.error('Erro detalhado:', error);
                alert(`Detalhes de ${className} não disponíveis!`);
            }
        }

        updateClassFeatures() {
            const resourcesContainer = document.getElementById('classResources');
            resourcesContainer.innerHTML = '';
            
            // Recursos principais
            const mainFeatures = this.currentClass.features
                .filter(f => f.level === this.characterLevel)
                .map(f => this.createFeatureElement(f));
            
            // Recursos de subclasse (se aplicável)
            const subclassFeatures = this.currentClass.subclasses
                .flatMap(sc => sc.features)
                .filter(f => f.level === this.characterLevel)
                .map(f => this.createFeatureElement(f));
            
            [...mainFeatures, ...subclassFeatures].forEach(feature => {
                resourcesContainer.appendChild(feature);
            });
        }

        createFeatureElement(feature) {
            const div = document.createElement('div');
            div.className = 'feature-item';
            div.innerHTML = `
                <h4>${feature.name} (Nível ${feature.level})</h4>
                <p>${feature.desc}</p>
            `;
            return div;
        }
        // Adicionar cálculo dos modificadores de atributo
calculateAll() {
    this.abilities.forEach(ability => {
        const score = parseInt(document.querySelector(`[data-ability="${ability}"] .score`).value) || 10;
        const mod = Math.floor((score - 10) / 2);
        document.querySelector(`[data-ability="${ability}"] .mod`).textContent = mod >= 0 ? `+${mod}` : mod;
    });
}

        updateProficiencies() {
            const skillList = document.querySelector('.skill-list');
            skillList.innerHTML = '';
            
            // Proficiências de armadura/armas
            const proficiencies = this.currentClass.proficiencies;
            const proficienciesHTML = proficiencies.map(p => `
                <div class="proficiency-item">
                    <input type="checkbox" checked disabled>
                    <label>${p.name}</label>
                </div>
            `).join('');
            
            // Perícias selecionáveis
            const skillOptions = this.currentClass.proficiency_choices
                .find(p => p.type === 'skills')?.from || [];
            
            const skillsHTML = skillOptions.map(skill => `
                <div class="skill-option">
                    <input type="checkbox" name="selectedSkills">
                    <label>${skill.name}</label>
                </div>
            `).join('');
        
            skillList.innerHTML = `
                <h4>Proficiências Iniciais</h4>
                ${proficienciesHTML}
                <h4>Escolha ${this.currentClass.proficiency_choices[0]?.choose} perícias:</h4>
                ${skillsHTML}
            `;
        }

        updateSavingThrows() {
            const savingThrows = document.querySelector('.saving-throws');
            savingThrows.innerHTML = this.currentClass.saving_throws
                .map(ab => `
                    <div class="saving-throw">
                        <input type="checkbox" checked disabled>
                        <label>${ab.name.toUpperCase()}</label>
                    </div>
                `).join('');
        }

        calculateProficiencyBonus() {
            return Math.floor(2 + (this.characterLevel - 1)/4);
        }

        setupEventListeners() {
            // Event listeners para atributos
            this.abilities.forEach(ability => {
                document.querySelector(`[data-ability="${ability}"] .score`)
                    .addEventListener('input', () => this.calculateAll());
            });
        
            // Evento de seleção de classe
            document.getElementById('classSelect').addEventListener('change', (e) => {
                this.loadClassFeatures(e.target.value);
            });
        
            // Evento de mudança de nível
            document.getElementById('characterLevel').addEventListener('input', (e) => {
                this.characterLevel = parseInt(e.target.value) || 1;
                document.getElementById('profBonus').textContent = `+${this.calculateProficiencyBonus()}`;
                if(this.currentClass) this.updateClassFeatures();
            });
        
            // Evento de level up
            document.getElementById('levelUpButton').addEventListener('click', () => {
                this.characterLevel = Math.min(20, this.characterLevel + 1);
                document.getElementById('characterLevel').value = this.characterLevel;
                document.getElementById('profBonus').textContent = `+${this.calculateProficiencyBonus()}`;
                if(this.currentClass) this.updateClassFeatures();
            });
        }
        
    }

    new CharacterSheet();
});