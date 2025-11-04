/* global api */

class enen_WordMask {
    constructor(options = {}) {
        this.options = options;
        this.word = '';
        this.maxexample = options.maxexample || 2;
    }

    async displayName() {
        return 'Word Mask Dictionary (EN→EN)';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample || this.maxexample;
    }

    findTerm(word = '') {
        return new Promise((resolve) => {
            this.word = word;
            const query = word.trim();
            if (!query) {
                resolve([]);
                return;
            }
            this.fetchDefinitions(query)
                .then(notes => resolve(notes.filter(Boolean)))
                .catch(() => resolve([]));
        });
    }

    fetchDefinitions(word) {
        const endpoint = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
        return new Promise(async (resolve, reject) => {
            try {
                const raw = await api.fetch(endpoint);
                const payload = JSON.parse(raw);
                if (!Array.isArray(payload) || payload.length === 0) {
                    resolve([]);
                    return;
                }
                const entry = payload[0];
                const expression = entry.word || word;
                const reading = this.pickPhonetic(entry);
                const audios = this.collectAudios(entry);
                const definitions = this.buildDefinitions(entry, expression);
                if (!definitions.length) {
                    resolve([]);
                    return;
                }
                const css = `
                    <style>
                        .odh-word-mask .pos {text-transform: lowercase; margin-right: 6px; padding: 2px 6px; border-radius: 4px; color: #fff; background-color: #0d47a1; font-size: 0.85em;}
                        .odh-word-mask ul {margin: 4px 0 10px; padding-left: 20px;}
                        .odh-word-mask li {margin-bottom: 4px; line-height: 1.4;}
                        .odh-word-mask .example {display: block; margin-top: 2px; font-size: 0.85em; color: #555;}
                    </style>`;
                resolve([{
                    css,
                    expression,
                    reading,
                    definitions,
                    audios
                }]);
            } catch (error) {
                reject(error);
            }
        });
    }

    buildDefinitions(entry, expression) {
        const definitions = [];
        const headwords = Array.from(new Set([expression, this.word].filter(Boolean)));
        for (const meaning of entry.meanings || []) {
            const pos = meaning.partOfSpeech ? `<span class="pos">${meaning.partOfSpeech}</span>` : '';
            const items = [];
            for (const def of meaning.definitions || []) {
                if (!def.definition) continue;
                const maskedDef = this.mask(def.definition, headwords);
                const example = def.example ? this.mask(def.example, headwords) : '';
                const exampleHtml = example ? `<span class="example">${example}</span>` : '';
                items.push(`<li>${maskedDef}${exampleHtml}</li>`);
            }
            if (items.length) {
                definitions.push(`<div class="odh-word-mask">${pos}<ul>${items.join('')}</ul></div>`);
            }
        }
        return definitions;
    }

    mask(text, headwords) {
        const replacement = 'word';
        return headwords.reduce((result, hw) => {
            if (!hw) return result;
            const escaped = this.escapeRegex(hw);
            const pattern = new RegExp(`\\b${escaped}(?:'s|s|es|ed|ing|er|est)?\\b`, 'gi');
            return result.replace(pattern, replacement);
        }, text);
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    pickPhonetic(entry) {
        if (!entry.phonetics) return '';
        const phonetic = entry.phonetics.find(item => item.text) || {};
        return phonetic.text || '';
    }

    collectAudios(entry) {
        if (!entry.phonetics) return [];
        const urls = entry.phonetics.map(item => item.audio).filter(Boolean);
        return Array.from(new Set(urls));
    }
}
