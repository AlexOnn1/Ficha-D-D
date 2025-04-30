console.log('Iniciando aplicação...');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/';
    await new Promise(resolve => setTimeout(resolve, 500));

// Traduz um texto do inglês para o português via LibreTranslate
async function translateToPt(text) {
    const resp = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text, 
        source: 'en', 
        target: 'pt',
        format: 'text'
      })
    });
    const data = await resp.json();
    return data.translatedText;
  }
  
    class CharacterSheet {
        constructor() {
            this.abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            this.currentClass = null;
            this.characterLevel = 1;
            this.translations = {
                features: {},   // vai receber classFeatures.json
                spells: {},     // vai receber spells.json
                attacks: {}     // vai receber attacks.json
              };
            this.init();
            this.featureCache = {}; // Evita múltiplas requisições do mesmo arquivo
        }

        

        async init() {
            await this.loadClassList();
            this.setupEventListeners();
            this.calculateAll();
            // await this.loadTranslations();
        // await this.loadClassList();
        }

        async loadClassList() {
            try {
                const response = await axios.get(`${apiBase}index.json`);
                const classMap = response.data;
        
                this.classMap = classMap; // <- Salvando o mapeamento
        
                this.gameData = {
                    classes: Object.keys(classMap) // Ex: ['barbarian', 'wizard', ...]
                };
        
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

async loadClassFeatures(className) {
    try {
      const classFile = this.classMap[className];
      const detailsUrl = `${apiBase}${classFile}`;
  
      // Requisição à API
      const response = await axios.get(detailsUrl);
      const raw = response.data;
  
      // Encontrar a classe correta dentro do array raw.class[]
      const matched = raw.class.find(c => c.name.toLowerCase() === className.toLowerCase());
      if (!matched) {
        console.warn(`Classe ${className} não encontrada em ${classFile}`);
        return;
      }
  
      // Montar currentClass com propriedades úteis
      this.currentClass = {
        ...matched,
        savingThrows: matched.savingThrow,
        proficiency: matched.proficiency || [],
        classFeatures: matched.classFeatures || []
      };
  
      // 🔧 Preencher classFeatureRefs corretamente
      this.classFeatureRefs = (matched.classFeatures || [])
        .filter(s => typeof s === 'string' && s.includes('|'))
        .map(s => {
          const [name,, , levelStr] = s.split('|');
          return {
            name: name.trim(),
            level: parseInt(levelStr, 10) || 1
          };
        });
  
      // Guardar todas as descrições completas de features
      this.allClassFeatures = raw.classFeature || [];
  
      console.log('Classe carregada:', this.currentClass);
      console.log('Refs gerados:', this.classFeatureRefs);
  
      // Atualizar a interface
      this.updateClassFeatures();
      this.updateProficiencies();
      this.updateSavingThrows();
  
    } catch (error) {
      console.error('Erro ao carregar recursos da classe:', error);
      alert('Erro ao carregar detalhes da classe!');
    }
  }
  
  
  // Atualiza os recursos de classe com base no nível
  updateClassFeatures() {
    // 1) Pega o iframe e seu documento
    const iframe = document.getElementById('featuresFrame');
    const doc = iframe.contentDocument || iframe.contentWindow.document;
  
    // 2) Inicializa o HTML do iframe
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; margin:0; padding:10px; }
            .feature-item { margin-bottom:1em; border-bottom:1px solid #ddd; padding-bottom:1em; }
            h4 { margin:0 0 .5em; }
          </style>
        </head>
        <body></body>
      </html>
    `);
    doc.close();
  
    // 3) Se não houver referências ou descrições, sai
    const refs = this.classFeatureRefs || [];
    if (!refs.length || !this.allClassFeatures.length) {
      console.warn('Sem dados de features carregados.');
      return;
    }
  
    // 4) Filtra só até o nível atual
    const granted = refs.filter(f => f.level <= this.characterLevel);
    if (!granted.length) {
      console.warn('Nenhuma feature para nível', this.characterLevel);
      return;
    }
  
    // 5) Cria container e popula
    const container = doc.createElement('div');
    granted.forEach(f => {
      const detail = this.allClassFeatures.find(df => df.name === f.name);
      if (!detail) {
        console.warn(`Descrição não encontrada para: ${f.name}`);
        return;
      }
      const entriesHtml = (detail.entries || [])
        .map(e =>
          typeof e === 'string'
            ? e
            : (e.name && e.entries)
              ? `<strong>${e.name}</strong>: ${e.entries.join('<br>')}`
              : JSON.stringify(e)
        )
        .join('<br><br>');
  
      const div = doc.createElement('div');
      div.className = 'feature-item';
      div.innerHTML = `
        <h4>${detail.name} (Nível ${f.level})</h4>
        <p>${entriesHtml}</p>
      `;
      container.appendChild(div);
    });
  
    // 6) Insere no body do iframe
    doc.body.appendChild(container);
  }
  







createFeatureElement(feature) {
    const div = document.createElement('div');
    div.className = 'feature-item';

    // As entries podem vir como string ou como objetos mais complexos
    let content = '';
    if (Array.isArray(feature.entries)) {
        content = feature.entries.map(e => {
            if (typeof e === 'string') return e;
            if (e.name && e.entries) {
                return `<strong>${e.name}</strong>: ${e.entries.join('<br>')}`;
            }
            return JSON.stringify(e); // fallback
        }).join('<br>');
    } else {
        content = feature.entries || '';
    }

    div.innerHTML = `
        <h4>${feature.name} (Nível ${feature.level})</h4>
        <p>${content}</p>
    `;
    return div;
}


updateProficiencies() {
    const skillList = document.querySelector('.skill-list');
    skillList.innerHTML = '';

    if (!this.currentClass?.proficiency) return;

    const proficienciesHTML = this.currentClass.proficiency
        .map(p => `
            <div class="proficiency-item">
                <input type="checkbox" checked disabled>
                <label>${p}</label>
            </div>
        `).join('');

    skillList.innerHTML = `
        <h3>Proficiências</h3>
        ${proficienciesHTML}
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
