/* global api */

class en_CustomWordMask {
    constructor(options = {}) {
        this.options = options;
        this.word = '';
    }

    async displayName() {
        return 'Word Mask Dictionary';
    }

    setOptions(options) {
        this.options = options;
    }

    async findTerm(word = '') {
        this.word = word;
        if (!word.trim()) return [];
        const notes = await this.fetchDefinitions(word.trim());
        return notes.filter(Boolean);
    }

    async fetchDefinitions(word) {
        const endpoint = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
        try {
            const raw = await api.fetch(endpoint);
            const payload = JSON.parse(raw);
            if (!Array.isArray(payload) || payload.length === 0) return [];
            const entry = payload[0];
            const expression = entry.word || word;
            const reading = this.pickPhonetic(entry);
            const audios = this.collectAudios(entry);
            const definitions = this.buildDefinitions(entry, expression);
            if (!definitions.length) return [];
            const css = `
                <style>
                    .odh-word-mask .pos {text-transform: lowercase; margin-right: 6px; padding: 2px 6px; border-radius: 4px; color: #fff; background-color: #0d47a1; font-size: 0.85em;}
                    .odh-word-mask ul {margin: 4px 0 10px; padding-left: 20px;}
                    .odh-word-mask li {margin-bottom: 4px; line-height: 1.4;}
                    .odh-word-mask .example {display: block; margin-top: 2px; font-size: 0.85em; color: #555;}
                </style>`;
            return [{
                css,
                expression,
                reading,
                definitions,
                audios
            }];
        } catch (error) {
            return [];
        }
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
        return headwords.reduce((result, hw) => {
            if (!hw) return result;
            const escaped = hw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const boundaryPattern = new RegExp(`\\b${escaped}\\b`, 'gi');
            let masked = result.replace(boundaryPattern, 'word');
            if (masked === result) {
                const fallbackPattern = new RegExp(escaped, 'gi');
                masked = masked.replace(fallbackPattern, 'word');
            }
            return masked;
        }, text);
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
