// POS + EN definition; replace headword with "the word" even inside HTML
class builtin_encn_Collins {
  constructor(options){ this.options=options; this.maxexample=2; this.word=''; }

  async displayName(){
    const locale = await api.locale();
    if (locale.indexOf('CN')!==-1) return '柯林斯英汉双解(内置)';
    if (locale.indexOf('TW')!==-1) return '柯林斯英漢雙解(內置)';
    return 'Collins EN->CN Dictionary((builtin))';
  }

  setOptions(options){ this.options=options; this.maxexample=options.maxexample; }

  async findTerm(word){
    this.word=word;
    const ws = await api.deinflect(word) || [];
    if (word.toLowerCase()!==word){
      const lc = word.toLowerCase();
      const lcws = await api.deinflect(lc) || [];
      return (await Promise.all([this.findCollins(word), this.findCollins(ws), this.findCollins(lc), this.findCollins(lcws)])).flat().filter(Boolean);
    }
    return (await Promise.all([this.findCollins(word), this.findCollins(ws)])).flat().filter(Boolean);
  }

  // --- helper: replace headword inside HTML text nodes ---
  replaceHeadwordHTML(html, headword){
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc(headword)}\\b`, 'gi');
    try {
      const div = document.createElement('div');
      div.innerHTML = html;
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        node.nodeValue = node.nodeValue.replace(re, 'the word');
      }
      return div.innerHTML;
    } catch (e) {
      // fallback（无 DOM 环境时）
      return html
        .replace(re, 'the word')
        .replace(new RegExp(`<\\s*b\\s*>\\s*${esc(headword)}\\s*<\\s*/\\s*b\\s*>`, 'gi'), 'the word')
        .replace(new RegExp(`<\\s*i\\s*>\\s*${esc(headword)}\\s*<\\s*/\\s*i\\s*>`, 'gi'), 'the word');
    }
  }

  async findCollins(word){
    if (!word) return [];
    let result={};
    try { result = JSON.parse(await api.getBuiltin('collins', word)); }
    catch { return []; }
    if (!result) return [];

    const expression = word;
    let reading='';
    if (result.readings && result.readings.length>0) reading = `/${result.readings[0]}/`;

    const defs = result.defs || [];
    const definitions = [];
    for (const def of defs){
      const pos = def.pos_en ? `<span class="pos">${def.pos_en}</span>` : '';
      let eng = def.def_en ? this.replaceHeadwordHTML(def.def_en, expression) : '';
      eng = eng ? `<span class="eng_tran">${eng}</span>` : '';
      const line = `${pos}<span class="tran">${eng}</span>`;
      if (pos || eng) definitions.push(line);
    }

    const css = this.renderCSS();
    return [{ css, expression, reading, definitions }];
  }

  renderCSS(){
    return `
<style>
  span.pos{ text-transform:lowercase;font-size:0.9em;margin-right:5px;padding:2px 4px;color:#fff;background:#0d47a1;border-radius:3px;}
  span.tran{ margin:0; padding:0;}
  span.eng_tran{ margin-right:3px; padding:0;}
</style>`;
  }
}
