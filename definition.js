// Collins EN->CN (POS + EN definition with <b>word</b> + CN translation)
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
    const stem = await api.deinflect(word) || [];
    if (word.toLowerCase()!==word){
      const lc = word.toLowerCase();
      const lcStem = await api.deinflect(lc) || [];
      const rs = await Promise.all([this.findCollins(word), this.findCollins(stem), this.findCollins(lc), this.findCollins(lcStem)]);
      return rs.flat().filter(Boolean);
    }
    const rs = await Promise.all([this.findCollins(word), this.findCollins(stem)]);
    return rs.flat().filter(Boolean);
  }

  // 将定义内的词头替换为加粗的 "word"
  replaceHeadwordHTML(html, headword){
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc(headword)}\\b`, 'gi');
    try{
      const div = document.createElement('div');
      div.innerHTML = html;
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
      const toProcess = [];
      let n;
      while ((n = walker.nextNode())) toProcess.push(n);
      for (const node of toProcess){
        if (!re.test(node.nodeValue)) continue;
        re.lastIndex = 0; // reset
        const parts = node.nodeValue.split(re);
        if (parts.length <= 1) continue;
        const frag = document.createDocumentFragment();
        for (let i=0;i<parts.length;i++){
          if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
          if (i < parts.length-1){
            const b = document.createElement('b');
            b.textContent = 'word';
            frag.appendChild(b);
          }
        }
        node.parentNode.replaceChild(frag, node);
      }
      return div.innerHTML;
    }catch(e){
      // 无 DOM 环境时的降级：直接替换为 HTML 片段
      return html.replace(re, '<b>word</b>');
    }
  }

  async findCollins(word){
    if (!word) return [];
    let result={};
    try{ result = JSON.parse(await api.getBuiltin('collins', word)); } catch { return []; }
    if (!result) return [];

    const expression = word;
    const reading = (result.readings && result.readings.length>0) ? `/${result.readings[0]}/` : '';
    const defs = result.defs || [];

    const definitions = [];
    for (const def of defs){
      const pos = def.pos_en ? `<span class="pos">${def.pos_en}</span>` : '';
      let eng = def.def_en ? this.replaceHeadwordHTML(def.def_en, expression) : '';
      eng = eng ? `<span class="eng_tran">${eng}</span>` : '';
      const chn = def.def_cn ? `<span class="chn_tran">${def.def_cn}</span>` : '';
      const line = `${pos}<span class="tran">${eng}${chn}</span>`;
      if (pos || eng || chn) definitions.push(line);
    }

    const css = this.renderCSS();
    return [{ css, expression, reading, definitions }];
  }

  renderCSS(){
    return `
<style>
  span.pos{ text-transform:lowercase;font-size:0.9em;margin-right:5px;padding:2px 4px;color:#fff;background:#0d47a1;border-radius:3px;}
  span.tran{ margin:0; padding:0;}
  span.eng_tran{ margin-right:6px; }
  span.chn_tran{ color:#0d47a1; }
</style>`;
  }
}
