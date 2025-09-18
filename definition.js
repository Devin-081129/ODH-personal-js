// Collins EN->CN Dictionary (POS + EN definition; replace headword with "the word")
class builtin_encn_Collins {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        const locale = await api.locale();
        if (locale.indexOf('CN') !== -1) return '柯林斯英汉双解(内置)';
        if (locale.indexOf('TW') !== -1) return '柯林斯英漢雙解(內置)';
        return 'Collins EN->CN Dictionary((builtin))';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let list = [];
        const word_stem = await api.deinflect(word) || [];
        if (word.toLowerCase() !== word) {
            const lowercase = word.toLowerCase();
            const lowercase_stem = await api.deinflect(lowercase) || [];
            list = [word, word_stem, lowercase, lowercase_stem];
        } else {
            list = [word, word_stem];
        }
        const results = await Promise.all(list.map((w) => this.findCollins(w)));
        return [].concat(...results).filter(x => x);
    }

    async findCollins(word) {
        let notes = [];
        if (!word) return notes;

        let result = {};
        try {
            result = JSON.parse(await api.getBuiltin('collins', word));
        } catch (err) {
            return [];
        }
        if (!result) return notes;

        const expression = word;
        let reading = '';
        if (result.readings && result.readings.length > 0) {
            reading = `/${result.readings[0]}/`;
        }

        const defs = result.defs || [];
        const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const headwordRe = new RegExp(escapeRegExp(expression), 'gi');

        // POS + EN definition only; replace headword with "the word"
        const definitions = [];
        for (const def of defs) {
            const pos = def.pos_en ? `<span class="pos">${def.pos_en}</span>` : '';
            let eng = def.def_en ? def.def_en.replace(headwordRe, 'the word') : '';
            eng = eng ? `<span class="eng_tran">${eng}</span>` : '';
            const line = `${pos}<span class="tran">${eng}</span>`;
            if (pos || eng) definitions.push(line);
        }

        const css = this.renderCSS();
        notes.push({ css, expression, reading, definitions });
        return notes;
    }

    renderCSS() {
        return `
<style>
  span.pos{ text-transform:lowercase;font-size:0.9em;margin-right:5px;padding:2px 4px;color:#fff;background:#0d47a1;border-radius:3px;}
  span.tran{ margin:0; padding:0;}
  span.eng_tran{ margin-right:3px; padding:0;}
</style>`;
    }
}

